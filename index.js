"use strict";

const DEBUG = false;
console.debug = function(...args) {
  if (DEBUG) {
    console.log(...args);
  }
};

const microViz = new MicroViz(microVizContainer);

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

let pathMatchers = null;

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

// SETUP AND HIGHLIGHT

function focusEvent(event) {
  if (event.activationEnv.sourceLoc) {
    pathMatchers = getPathMatchers(event.activationEnv);
    microViz.setPaths(pathMatchers);
    pathMatchers.forEach(path => microViz.addImplementation(path.env.microVizEvents));

    macroViz.events.forEach(e => {
      const nodeView = macroViz.getNodeView(e);
      if (pathMatchers.some(path => path.env === e.activationEnv)) {
        nodeView.DOM.classList.add('highlight-focused');
      } else {
        nodeView.DOM.classList.remove('highlight-focused');
      }
    });
  }
}

const macroViz = new MacroViz(macroVizContainer);
macroViz.addListener('click', (__, event, _) => focusEvent(event));

let defMarker = null;
let refMarker = null;
macroViz.addListener('mouseover', (__, event, _) => {
  if (event instanceof SendEvent) {
    defMarker = highlightSourceLoc(event.activationEnv.sourceLoc, 'def');
  }
  refMarker = highlightSourceLoc(event.sourceLoc, 'ref');
});
macroViz.addListener('mouseout', (__, event, _) => {
  if (refMarker) { refMarker.clear(); }
  if (defMarker) { defMarker.clear(); }
});

const editor = microViz.editor;
editor.setOption('lineNumbers', true);

editor.getWrapperElement().onmousemove = e => {
  const pos = editor.coordsChar({left: e.pageX, top: e.pageY});
  highlightEventNodesAtPos(pos);
}

editor.getWrapperElement().onmouseout = e => {
  macroViz.events.forEach(event => {
    const nodeView = macroViz.getNodeView(event);
    nodeView.DOM.classList.remove(
      'highlight-cursorOnDecl',
      'highlight-cursorOnSend',
      'highlight-cursorOnSelector');
  });
}

editor.on('cursorActivity', _ => {
  const pos = editor.doc.getCursor('head');
  highlightEventNodesAtPos(pos);
});

function highlightEventNodesAtPos(pos) {
  const idx = editor.doc.indexFromPos(pos);
  macroViz.events.forEach(event => {
    if (!(event instanceof SendEvent)) return;
    const nodeView = macroViz.getNodeView(event);
    nodeView.DOM.classList.remove(
      'highlight-cursorOnDecl',
      'highlight-cursorOnSend',
      'highlight-cursorOnSelector');
    if (event.sourceLoc && event.sourceLoc.containsIdx(idx)) {
      nodeView.DOM.classList.add('highlight-cursorOnSend');
    } else if (event.activationEnv.sourceLoc &&
        event.activationEnv.sourceLoc.containsIdx(idx)) {
      nodeView.DOM.classList.add('highlight-cursorOnDecl');
    }
  })

}

let resultWidget = null;

microViz.addListener('mouseover', (DOMEvent, event, view) => {
  if (DOMEvent.getModifierState('Meta')) console.log('meta');
  if (event instanceof SendEvent && !view.isImplementation) {
    view.DOM.setAttribute('title', event.toDetailString());

    clearResultWidget();
    clearDefMarker();
    clearRefMarker();

    defMarker = highlightSourceLoc(event.activationEnv.sourceLoc, 'def');
    refMarker = highlightSourceLoc(event.sourceLoc, 'ref');
    highlightEventNodesAtPos(editor.posFromIndex(event.sourceLoc.startPos));

    resultWidget = addResultWidget(
        event.sourceLoc,
        event.hasOwnProperty('returnValue') ? event._valueString(event.returnValue) : '?');
  }
});

microViz.addListener('click', (DOMEvent, event, view) => {
  if (DOMEvent.getModifierState('Meta') && event instanceof SendEvent && !view.isImplementation) {
    focusEvent(event);
  }
})


function clearResultWidget() {
  if (resultWidget) {
    $(resultWidget).remove();
  }
}

function clearDefMarker () {
  if (defMarker) {
    defMarker.clear();
  }
}

function clearRefMarker () {
  if (refMarker) {
    refMarker.clear();
  }
}

microViz.addListener('mouseout', (DOMEvent, _, view) => {
  clearResultWidget();
  clearDefMarker();
  clearRefMarker();
  
  macroViz.events.forEach(event => {
    const nodeView = macroViz.getNodeView(event);
    nodeView.DOM.classList.remove(
      'highlight-cursorOnDecl',
      'highlight-cursorOnSend',
      'highlight-cursorOnSelector');
  });
});

function highlightSourceLoc(sourceLoc, highlightType) {
  if (!sourceLoc) {
    return;
  }
  const startPos = editor.doc.posFromIndex(sourceLoc.startPos);
  const endPos = editor.doc.posFromIndex(sourceLoc.endPos);
  return editor.doc.markText(startPos, endPos, {className: 'highlight-' + highlightType});
}

// RESULT WIDGETS

function addResultWidget(sourceLoc, resultString) {
  if (!sourceLoc) {
    return;
  }
  const startPos = editor.doc.posFromIndex(sourceLoc.startPos);
  const endPos = editor.doc.posFromIndex(sourceLoc.endPos);
  const widget = d('resultWidget', {}, '⇒ ' + resultString);
  editor.addWidget({line: endPos.line, ch: startPos.ch}, widget);
  return widget;
}

// ERRORS

function clearError() {
  errorDiv.innerHTML = '';
}

function displayError(message) {
  errorDiv.innerHTML = '';
  errorDiv.innerText = message;
}

// RUN INTERPRETER

let interpreter;
let R;
let timeoutId;

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
          microViz.addImplementation(pathMatcher.env.microVizEvents);
        }
      });
    });
    microViz.setPaths(pathMatchers);
    microViz.addImplementation(pathMatchers[0].env.microVizEvents);
  }

  let done;
  try {
    done = interpreter.runForMillis(30);
  } catch (e) {
    displayError(e.toString());
    done = true;
  }

  if (done) {
    timeoutId = null;
    console.log('(done)');
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

editor.on('changes', function(cmInstance, changes) {
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
    $(error).hide()/*.delay(2000)*/.slideDown()/*.queue(() => editor.refresh());*/;
  }
});

// Local storage keys
const LS_KEY_PREFIX = 'app17392_';
const LS_editorsShareOfUsableHeight = LS_KEY_PREFIX + 'editorsShareOfUsableHeight';

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
  $(macroVizScroller).outerHeight(usableHeight - $(topHalf).outerHeight());
}



const sampleProgram = `"hello world".println();

(3 + 4).println();

var sum = 0;
for 1 to: 10 do: {x |
  sum = sum + x;
};
sum.println();`;
editor.setValue(localStorage.getItem('seymour-program') || sampleProgram);
