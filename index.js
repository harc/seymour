"use strict";

// TODO: factor out some of this UI logic

const DEBUG = false;
console.debug = function(...args) {
  if (DEBUG) {
    console.log(...args);
  }
};

class PathMatcher {
  constructor(path, env = null) {
    this.path = path;
    this.idx = env ? path.length : 0;
    this.envAtIdx = env;
  }

  reset(globalEnv) {
    this.idx = 0;
    this.envAtIdx = globalEnv;
  }

  get env() {
     return this.idx === this.path.length ? this.envAtIdx : null;
  }

  processEvent(child, parent) {
    console.assert(this.idx < this.path.length);
    if (this.envAtIdx === parent.activationEnv &&
        child.activationPathToken === this.path[this.idx]) {
      this.idx++;
      this.envAtIdx = child.activationEnv;
    }
  }
}

function getPathMatchers(activationEnv) {
  const pathMatchers = [];
  let env = activationEnv;
  while (env) {
    pathMatchers.unshift(getPathMatcher(env));
    env = env.parentEnv;
  }
  return pathMatchers;
}

function getPathMatcher(activationEnv) {
  return new PathMatcher(getPath(activationEnv), activationEnv);
}

function getPath(activationEnv) {
  const path = [];
  while (true) {
    const callerEnv = activationEnv.callerEnv;
    if (callerEnv) {
      path.push(activationEnv.programOrSendEvent.activationPathToken);
      activationEnv = callerEnv.programOrSendEvent.activationEnv;
    } else {
      break;
    }
  }
  path.reverse();
  return path;
}

// RUN INTERPRETER

let interpreter;
let R;
let timeoutId;

let running = false;
function toggleRunning(optFlag = null) {
  if (optFlag !== null) {
    running = optFlag;
  } else {
    running = !running;
  }
  workingIndicator.style.color = running ? 'red' : 'black';
}

function run(ast, code) {
  if (arguments.length === 2) {
    clearError();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    Obj.nextId = 0;
    R = new EventRecorder();
    macroViz.setEventRecorder(R);
    interpreter = new Interpreter(ast.sourceLoc, code, R);
    if (pathMatchers === null) {
      pathMatchers = getPathMatchers(interpreter.global.env);
    }
    pathMatchers.forEach(pathMatcher => pathMatcher.reset(interpreter.global.env));

    R.addListener('addChild', (child, parent) => {
      pathMatchers.forEach(pathMatcher => {
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

    clearFocus();
    focusPath(pathMatchers[0]);
  }

  let done;
  toggleRunning(true);
  try {
    done = interpreter.runForMillis(30);
  } catch (e) {
    const activationEnv = R.currentProgramOrSendEvent.activationEnv;
    R.error(
      activationEnv ? null : R.currentProgramOrSendEvent.sourceLoc, 
      activationEnv || R.currentProgramOrSendEvent.env, e.toString());
    displayError(e.toString());
    done = true;
  }

  if (done) {
    timeoutId = null;
    console.log('(done)');
    toggleRunning(false);
  } else {
    timeoutId = setTimeout(run, 0);
  }
}

let parseErrorWidget;
const m = seymourGrammar.matcher();

editor.on('beforeChange', function(cmInstance, changeObj) {
  var insertedText = changeObj.text.join('\n');
  var fromIdx = editor.indexFromPos(changeObj.from);
  var toIdx = editor.indexFromPos(changeObj.to);
  m.replaceInputRange(fromIdx, toIdx, insertedText);
});

function handleChanges(cmInstance, changes) {
  if (parseErrorWidget) {
    editor.removeLineWidget(parseErrorWidget);
    parseErrorWidget = undefined;
  }

  localStorage.setItem('seymour-program', editor.getValue());

  syntaxHighlight(editor, m);

  const r = m.match();
  if (r.succeeded()) {
    // console.clear();
    const ast = parse(r);
    console.debug('ast', ast);
    const code = preludeAST.toInstruction(ast.toInstruction(new IDone()));
    console.debug('code', code);
    run(ast, code);
  } else {
    const expected = r.getExpectedText();
    const pos = editor.doc.posFromIndex(r.getRightmostFailurePosition());
    const error = document.createElement('parseError');
    error.innerText = spaces(pos.ch) + '^\nExpected: ' + expected;
    parseErrorWidget = editor.addLineWidget(pos.line, error);
    $(error).hide().delay(2000).slideDown().queue(() => {
      if (parseErrorWidget) {
        parseErrorWidget.changed();
      }
    });
    parseErrorWidget.changed();
  }
}

const handleChangesDebounced = _.debounce(handleChanges, 500);

editor.on('changes', function(cmInstance, changes) {
  handleChangesDebounced(cmInstance, changes);
});

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
editor.setValue(localStorage.getItem('seymour-program') || sampleProgram);
