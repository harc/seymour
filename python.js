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

    this.socket = new WebSocket('ws://localhost:8000');
    this.socket.addEventListener('message', (message) => this.onMessage(message));
    // TODO: guarantee run happens after socket is opened
    this.socket.addEventListener('open', () => this.onOpen());
  }

  run(originalCode, instrumentedCode) {
    this.emit('codeChanged', originalCode);
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    
    SourceLoc.setupCodeMap(originalCode);
    this.R = new EventRecorder();
    if (this.macroVizContainer) {
      this.macroViz.setEventRecorder(this.R);
    }

    if (!this.opened) { debugger; }
    this.socket.send(JSON.stringify({ type: 'kill' }))
    this.socket.send(JSON.stringify({
      type: 'run',
      code: instrumentedCode
    }));

    this.R.addListener('addChild', (child, parent) => {
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
    });
  }

  handleChanges(cmInstance, changes) {
    if (this.parseErrorWidget) {
      this.editor.removeLineWidget(this.parseErrorWidget);
      this.parseErrorWidget = undefined;
    }

    // syntaxHighlight(this.editor, this.m);
    if (this.changesTimeout) {
      clearTimeout(this.changesTimeout);
    }

    try {
      const instrumentedCode = this.instrumenter.instrument();
      console.log(instrumentedCode);
      this.changesTimeout = setTimeout(() => {
        this.run(this.instrumenter.code, instrumentedCode);
        this.changesTimeout = null;
      }, 200);
    } catch (parseError) {
      console.error(parseError);
    }
  }

  processChange(changeObj) {
    const insertedText = changeObj.text.join('\n');
    const fromIdx = this.editor.indexFromPos(changeObj.from);
    const toIdx = this.editor.indexFromPos(changeObj.to);
    this.instrumenter.replaceInputRange(fromIdx, toIdx, insertedText);
    console.log(this.instrumenter.code);
    console.log(this.instrumenter.preprocessedCode);
  }

  onMessage(event) {
    const data = JSON.parse(e.data); 
    console.log(data); 
    switch(data.type) {
      case 'Env':
      case 'Scope':
        envs[data.id] = fixupEnv(data);
        R._registerSend(envs[data.id])
        if (envs[data.id].callerEnv == null) { // global env
          if (this.pathMatchers === null) {
            this.pathMatchers = getPathMatchers(envs[data.id]);
          }
          this.pathMatchers.forEach(pathMatcher => pathMatcher.reset(envs[data.id]));

          this.highlighting.clearFocus();
          this.highlighting.focusPath(this.pathMatchers[0]);
        }
        break;
      case 'done':
        break;
      default:
        fixupEvent(R, data)
    }
  }

  onOpen() {
    this.opened = true;
  }
}