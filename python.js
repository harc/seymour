const eventArgOrders = {
  ProgramEvent: ['orderNum', 'sourceLoc'],
  SendEvent: ['orderNum', 'sourceLoc', 'envId', 'recv', 'selector', 'args', 'activationPathToken'],
  VarDeclEvent: ['orderNum', 'sourceLoc', 'envId', 'declEnvId', 'name', 'value'],
  VarAssignmentEvent: ['orderNum', 'sourceLoc', 'envId', 'declEnvId', 'name', 'value'],
  InstVarAssignmentEvent: ['orderNum', 'sourceLoc', 'envId', 'obj', 'name', 'value'],
  InstantiationEvent: ['orderNum', 'sourceLoc', 'envId', 'class', 'args', 'newInstance'],
  ReceiveEvent: ['envId', 'returnValue'],
  LocalReturnEvent: ['orderNum', 'sourceLoc', 'envId', 'value'],
  ErrorEvent: ['sourceLoc', 'envId', 'errorString']
};
const eventMethods = {
  ProgramEvent: 'program',
  SendEvent: 'send',
  VarDeclEvent: 'declVar',
  VarAssignmentEvent: 'assignVar',
  InstVarAssignmentEvent: 'assignInstVar',
  InstantiationEvent: 'instantiate',
  ReceiveEvent: 'receive',
  LocalReturnEvent: 'localReturn',
  ErrorEvent: 'error'
};
const typeToClass = {
  Env,
  Scope
}

const MESSAGES_PER_PERIOD = 10;
const SECONDS_PER_PERIOD = 0.1;

class Python extends CheckedEmitter {
  constructor(microVizContainer, macroVizContainer = null, enableMicroViz = true, 
    enableHighlighting = true) {
    super();

    this.microVizContainer = microVizContainer || null;
    this.macroVizContainer = macroVizContainer || null;

    this.registerEvent('codeChanged', 'code');
    this.registerEvent('run', 'ast', 'code');
    this.registerEvent('error', 'e');
    this.registerEvent('done', 'ast', 'code');

    // setup
    this.microViz = new MicroViz(this.microVizContainer, enableMicroViz);
    this.editor = this.microViz.editor;
    this.editor.setOption('lineNumbers', true);
    this.editor.setOption("extraKeys", {
      Tab: function(cm) {
        var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
        cm.replaceSelection(spaces);
      }
    });

    if (this.macroVizContainer) {
      this.macroViz = new MacroViz(this.macroVizContainer);
    }

    this.pathMatchers = null;

    // highlighting
    this.highlighting = new Highlighting(this, enableHighlighting);
    
    // tie the knot
    this.R = null;
    this.timeoutId = null;
    this.running = false;

    this.m = pythonGrammar.matcher();

    this.parseErrorWidget = null;
    
    this.editor.on('beforeChange', (cmInstance, changeObj) => {
      this.processChange(changeObj);
    });

    this.editor.on('changes', (cmInstance, changes) => {
      this.handleChanges(cmInstance, changes);
    });
    
    this.instrumenter = new IncrementalInstrumenter();

    this.socket = new WebSocket('ws://localhost:8004');
    this.socket.addEventListener('message', (message) => this.onMessage(message));
    // TODO: guarantee run happens after socket is opened
    this.socket.addEventListener('open', () => this.onOpen());
    this.socket.addEventListener('close', (event) => console.log('CLOSED', event));
    this.socket.addEventListener('error', (error) => console.log('ERROR', error));

    this.envs = {};
    this.events = {};
    this.messageQueue = [];
    this.eventProcessingTimeout = null;
  }

  run(originalCode, instrumentedCode) {
    this.emit('codeChanged', originalCode);
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    
    // SourceLoc.setupCodeMap(originalCode);
    this.R = new EventRecorder();
    if (this.macroVizContainer) {
      this.macroViz.setEventRecorder(this.R);
    }

    console.log('pathmatchers', this.pathMatchers);
    this.R.addListener('activateSend', (child) => {
      const parent = child.env ? child.env.programOrSendEvent : null;
      if (this.pathMatchers) {
        this.pathMatchers.forEach(pathMatcher => {
          if (pathMatcher.env) {
            // nothing to do
            return;
          }
          pathMatcher.processEvent(child, parent);
          if (pathMatcher.env) {
            this.highlighting.focusPath(pathMatcher);
          }
        });
      }
    });
    
    this.R.addListener('addChild', (child, _) => {
      if (child instanceof ErrorEvent) {
        this.emit('error', child.errorString);
      }
    });

    // if (!this.opened) { debugger; }
    this.envs = {};
    this.events = {};
    this.messageQueue = [];
    if (this.eventProcessingTimeout !== null) {
      clearTimeout(this.eventProcessingTimeout);
    }
    this.eventProcessingTimeout = setTimeout(()=>this.processSomeMessages(), 1000*SECONDS_PER_PERIOD);
    this.socket.send(JSON.stringify({ type: 'kill' }))
    this.socket.send(JSON.stringify({
      type: 'run',
      code: instrumentedCode,
      sourceLocs: {}
    }));

  }

  handleChanges(cmInstance, changes) {
    if (this.lexingFailed) {
      return;
    }

    // syntaxHighlight(this.editor, this.m);
    if (this.changesTimeout) {
      clearTimeout(this.changesTimeout);
    }

    try {
      const instrumentedCode = this.instrumenter.instrument();
      console.log(this.instrumenter.code);
      console.log(instrumentedCode);
      this.changesTimeout = setTimeout(() => {
        this.run(this.instrumenter.code, instrumentedCode);
        this.changesTimeout = null;
      }, 200);
    } catch (parseError) {
      if (!(parseError instanceof ParseError)) {
        console.error(parseError);
        console.error('show this in the codemirror');
      } else {
        const pos = this.editor.doc.posFromIndex(parseError.idx);
        const error = document.createElement('parseError');
        error.innerText = spaces(pos.ch) + parseError.message;
        this.parseErrorWidget = this.editor.addLineWidget(pos.line, error);
        this.changesTimeout = setTimeout(() => {
          $(error).slideDown().queue(() => {
            if (this.parseErrorWidget) {
              this.parseErrorWidget.changed();
            }
          });
          this.changesTimeout = null;
        }, 2000);
        $(error).hide();
        this.parseErrorWidget.changed();
      }
    }
  }

  processChange(changeObj) {
    if (this.parseErrorWidget) {
      this.editor.removeLineWidget(this.parseErrorWidget);
      this.parseErrorWidget = undefined;
    }

    const insertedText = changeObj.text.join('\n');
    const fromIdx = this.editor.indexFromPos(changeObj.from);
    const toIdx = this.editor.indexFromPos(changeObj.to);
    try {
      this.instrumenter.replaceInputRange(fromIdx, toIdx, insertedText);
      this.lexingFailed = false;
    } catch (e) {
      if (!(e instanceof IndentationError || e instanceof ParensError)) {
        console.error(e);
        console.error('show this in the codemirror');
      } else {
        const pos = this.editor.doc.posFromIndex(e.idx);
        const error = document.createElement('parseError');
        error.innerText = spaces(pos.ch) + e.message;
        this.parseErrorWidget = this.editor.addLineWidget(pos.line, error);
        this.changesTimeout = setTimeout(() => {
          $(error).slideDown().queue(() => {
            if (this.parseErrorWidget) {
              this.parseErrorWidget.changed();
            }
          });
          this.changesTimeout = null;
        }, 2000);
        $(error).hide();
        this.parseErrorWidget.changed();
      }
      this.lexingFailed = true;
    }
  }

  onMessage(event) {
    const data = JSON.parse(event.data); 
    this.messageQueue.push(data);
  }

  processSomeMessages() {
    let messagesToProcess = MESSAGES_PER_PERIOD;
    while (this.messageQueue.length > 0 && messagesToProcess > 0) {
      const data = this.messageQueue.shift();
      switch(data.type) {
        case 'Env':
        case 'Scope':
          this.envs[data.id] = this.fixupEnv(data);
          this.R._registerSend(this.envs[data.id])
          if (this.envs[data.id].callerEnv == null) { // global env
            if (this.pathMatchers === null) {
              this.pathMatchers = getPathMatchers(this.envs[data.id]);
            }
            this.pathMatchers.forEach(pathMatcher => pathMatcher.reset(this.envs[data.id]));
  
            this.highlighting.clearFocus();
            this.highlighting.focusPath(this.pathMatchers[0]);
          }
          break;
        case 'done':
          break;
        default:
          this.fixupEvent(data)
      }
      messagesToProcess--;
    }

    this.eventProcessingTimeout = setTimeout(()=>this.processSomeMessages(), 1000*SECONDS_PER_PERIOD);
  }

  onOpen() {
    this.opened = true;
  }

  fixupEnv(envJSON) {
    const env = new typeToClass[envJSON.type](
      makeSourceLoc(envJSON.sourceLoc),
      this.envs[envJSON.parentEnvId],
      this.envs[envJSON.callerEnvId],
      this.events[envJSON.programOrSendEventId]
    );
    if (env.programOrSendEvent instanceof ProgramEvent) {
      this.globalEnv = env;
      env.programOrSendEvent.activationEnv = env;
    }
    console.log(env);
    return env;
  }

  fixupEvent(eventJSON) {
    const args = [];
    eventArgOrders[eventJSON.type].forEach(key => {
      if (key.includes('Env') || key.includes('env')) {
        args.push(this.envs[eventJSON[key]]);
      } else if (key === 'sourceLoc') {
        args.push(makeSourceLoc(eventJSON.sourceLoc))
      } else if (key === 'returnValue') {
        args.push(JSON.parse(eventJSON.returnValue));
      } else {
        args.push(eventJSON[key]);
      }
    });
    this.R[eventMethods[eventJSON.type]](...args);
    this.R.lastEvent.id = eventJSON.id;
    this.events[this.R.lastEvent.id] = this.R.lastEvent;
    console.log(this.R.lastEvent);
  }
}


function makeSourceLoc(json) {
  if (json === null) {
    return null;
  }
  return new SourceLoc(
    json.startIdx,
    json.endIdx
  )
}

