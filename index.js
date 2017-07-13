"use strict";

// TODO: factor out some of this UI logic

const DEBUG = false;
console.debug = function(...args) {
  if (DEBUG) {
    console.log(...args);
  }
};

class Seymour extends CheckedEmitter {
  // TODO: allow passing in either micro or macro as null
  // TODO: flag for highlighting
  constructor(microVizContainer, macroVizContainer) {
    super(); 
    this.registerEvent('codeChanged', 'code');
    this.registerEvent('run', 'ast', 'code');
    this.registerEvent('error', 'e');
    this.registerEvent('done', 'ast', 'code');

    // setup
    this.microViz = new MicroViz(microVizContainer);
    this.editor = this.microViz.editor;
    this.editor.setOption('lineNumbers', true);

    this.macroViz = new MacroViz(macroVizContainer);

    this.pathMatchers = null;

    // highlighting
    this.highlighting = new Highlighting(this);

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
      this.handleChangesDebounced(cmInstance, changes);
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
      this.macroViz.setEventRecorder(this.R);
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
            focusPath(pathMatcher);
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
        activationEnv ? null : R.currentProgramOrSendEvent.sourceLoc, 
        activationEnv || R.currentProgramOrSendEvent.env, e.toString());
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

    const r = this.m.match();
    if (r.succeeded()) {
      // console.clear();
      const ast = parse(r);
      console.debug('ast', ast);
      const code = preludeAST.toInstruction(ast.toInstruction(new IDone()));
      console.debug('code', code);
      this.run(ast, code);
    } else {
      const expected = r.getExpectedText();
      const pos = this.editor.doc.posFromIndex(r.getRightmostFailurePosition());
      const error = document.createElement('parseError');
      error.innerText = spaces(pos.ch) + '^\nExpected: ' + expected;
      parseErrorWidget = this.editor.addLineWidget(pos.line, error);
      $(error).hide().delay(2000).slideDown().queue(() => {
        if (parseErrorWidget) {
          this.parseErrorWidget.changed();
        }
      });
      this.parseErrorWidget.changed();
    }
  }
}

Seymour.prototype.handleChangesDebounced = _.debounce(Seymour.prototype.handleChanges, 500);

// -----

const S = new Seymour(microVizContainer, macroVizContainer);

S.addListener('codeChanged', code => {
  clearError();
  localStorage.setItem('seymour-program', S.editor.getValue());
});

S.addListener('run', (_, __) => toggleRunning(true));

S.addListener('error', e => displayError(e.toString()));

S.addListener('done', (_, __) => toggleRunning(false));


let running = false;
function toggleRunning(optFlag = null) {
  if (optFlag !== null) {
    running = optFlag;
  } else {
    running = !running;
  }
  workingIndicator.style.color = running ? 'red' : 'black';
}

// ERRORS

function clearError() {
  errorDiv.innerHTML = '';
}

function displayError(message) {
  errorDiv.innerHTML = '';
  errorDiv.innerText = message;
}


// Local storage keys
const LS_KEY_PREFIX = 'app17392_';
const LS_editorsShareOfUsableHeight = LS_KEY_PREFIX + 'editorsShareOfUsableHeight';

// RESIZE LOGIC
let editorsShareOfUsableHeight = localStorage.getItem(LS_editorsShareOfUsableHeight) || 0.5;

fixHeights();

$(errorDiv).mousedown(e => {
  $(errorDiv).data('lastY', e.clientY);
  $('body').mousemove(bodyMouseMoveHandler);
  $('body').mouseup(bodyMouseUpHandler);

  function bodyMouseUpHandler(e) {
    $(errorDiv).data('lastY', null);
    $('body').off('mousemove', bodyMouseMoveHandler);
    $('body').off('mouseup', bodyMouseUpHandler);
  }
  function bodyMouseMoveHandler(e) {
    const lastY = $(errorDiv).data('lastY');
    if (!lastY) {
      return;
    }
    e.preventDefault();
    const delta = e.clientY - lastY;
    const newEditorHeight = $(topHalf).outerHeight() + delta;
    const usableHeight = $(window).innerHeight() - $(errorDiv).outerHeight(true);
    editorsShareOfUsableHeight = newEditorHeight / usableHeight;
    localStorage.setItem(LS_editorsShareOfUsableHeight, editorsShareOfUsableHeight);
    $(errorDiv).data('lastY', e.clientY);
    fixHeights();
  }
});

function fixHeights() {
  const usableHeight = $(window).innerHeight() - $(errorDiv).outerHeight(true);
  $(topHalf).outerHeight(usableHeight * editorsShareOfUsableHeight);
  $(bottomHalf).outerHeight(usableHeight - $(topHalf).outerHeight());
}



const sampleProgram = `"hello world".println();

(3 + 4).println();

var sum = 0;
for 1 to: 10 do: {x |
  sum = sum + x;
};
sum.println();`;
S.editor.setValue(localStorage.getItem('seymour-program') || sampleProgram);
