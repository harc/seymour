class Seymour extends CheckedEmitter {
  constructor(microVizContainer, macroVizContainer = null, 
        enableMicroViz = true, enableHighlighting = true) {
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
    this.interpreter = null;
    this.R = null;
    this.timeoutId = null;
    this.running = false;

    this.m = seymourGrammar.matcher();

    this.parseErrorWidget = null;

    this.editor.on('beforeChange', (cmInstance, changeObj) => {
      var insertedText = changeObj.text.join('\n');
      var fromIdx = this.editor.indexFromPos(changeObj.from);
      var toIdx = this.editor.indexFromPos(changeObj.to);
      this.m.replaceInputRange(fromIdx, toIdx, insertedText);
    });

    this.editor.on('changes', (cmInstance, changes) => {
      this.handleChanges(cmInstance, changes);
    });
  }

  run(ast, code = null) {
    if (code !== null) {
      this.emit('codeChanged', code);
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
      }
      Obj.nextId = 0;
      this.R = new EventRecorder();
      if (this.macroVizContainer) {
        this.macroViz.setEventRecorder(this.R);
      }
      this.interpreter = new Interpreter(ast.sourceLoc, code, this.R);
      if (this.pathMatchers === null) {
        this.pathMatchers = getPathMatchers(this.interpreter.global.env);
      }
      this.pathMatchers.forEach(pathMatcher => pathMatcher.reset(this.interpreter.global.env));

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

      this.highlighting.clearFocus();
      this.highlighting.focusPath(this.pathMatchers[0]);
    }

    let done;
    this.emit('run', ast, code);
    try {
      done = this.interpreter.runForMillis(30);
    } catch (e) {
      const activationEnv = this.R.currentProgramOrSendEvent.activationEnv;
      this.R.error(
        activationEnv ? null : this.R.currentProgramOrSendEvent.sourceLoc, 
        activationEnv || this.R.currentProgramOrSendEvent.env, e.toString());
      this.emit('error', e);
      done = true;
    }

    if (done) {
      this.emit('done', ast, code);
      this.timeoutId = null;
      console.log('(done)');
    } else {
      this.timeoutId = setTimeout(() => this.run(), 0);
    }
  }

  handleChanges(cmInstance, changes) {
    if (this.parseErrorWidget) {
      this.editor.removeLineWidget(this.parseErrorWidget);
      this.parseErrorWidget = undefined;
    }

    syntaxHighlight(this.editor, this.m);
    if (this.changesTimeout) {
      clearTimeout(this.changesTimeout);
    }

    const r = this.m.match();
    if (r.succeeded()) {
      // console.clear();
      const ast = parse(r);
      console.debug('ast', ast);
      const code = preludeAST.toInstruction(ast.toInstruction(new IDone()));
      console.debug('code', code);
      this.changesTimeout = setTimeout(() => {
        this.run(ast, code);
        this.changesTimeout = null;
      }, 200);
    } else {
      const expected = r.getExpectedText();
      const pos = this.editor.doc.posFromIndex(r.getRightmostFailurePosition());
      const error = document.createElement('parseError');
      error.innerText = spaces(pos.ch) + '^\nExpected: ' + expected;
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