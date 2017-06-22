"use strict";

const DEBUG = false;
console.debug = function(...args) {
  if (DEBUG) {
    console.log(...args);
  }
};

const microViz = new MicroViz(microVizContainer);

let pathToSelectedEnv = [];
let pathToSelectedEnvIdx = 0;
let envAtPathIdx = null;

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

const macroViz = new MacroViz(macroVizContainer);
macroViz.addListener('click', (event, _) => {
  if (event.activationEnv.sourceLoc) {
    pathToSelectedEnv = getPath(event.activationEnv);
    pathToSelectedEnvIdx = pathToSelectedEnv.length;
    envAtPathIdx = event.activationEnv;
    microViz.setEnv(event.activationEnv);
  }
});

const editor = microViz.editor;
editor.setOption('lineNumbers', true);

let sendHighlight = null;
let resultWidget = null;

microViz.addListener('mouseover', (event, view) => {
  if (event instanceof SendEvent && !view.isImplementation) {
    view.DOM.setAttribute('title', event.toDetailString());
    sendHighlight = highlightSourceLoc(event.sourceLoc, 'emptysend');
    resultWidget = addResultWidget(
        event.sourceLoc,
        event.hasOwnProperty('returnValue') ? event._valueString(event.returnValue) : '?');
  }
});

microViz.addListener('mouseout', (_, view) => {
  if (sendHighlight) {
    sendHighlight.clear();
    $(resultWidget).remove();
  }
});

function highlightSourceLoc(sourceLoc, highlightType) {
  if (!sourceLoc) {
    return;
  }
  const startPos = editor.doc.posFromIndex(sourceLoc.startPos);
  const endPos = editor.doc.posFromIndex(sourceLoc.endPos);
  return editor.doc.markText(startPos, endPos, {className: 'highlight-' + highlightType});
}

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

let interpreter;
let R;
let timeoutId;

function run(ast, code) {
  if (arguments.length === 2) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    Obj.nextId = 0;
    R = new EventRecorder();
    R.addListener('addChild', (child, parent) => {
      if (pathToSelectedEnvIdx < pathToSelectedEnv.length &&
          envAtPathIdx === parent.activationEnv &&
          child.activationPathToken === pathToSelectedEnv[pathToSelectedEnvIdx]) {
        pathToSelectedEnvIdx++;
        envAtPathIdx = child.activationEnv;
        if (pathToSelectedEnvIdx === pathToSelectedEnv.length) {
          microViz.setEnv(envAtPathIdx);
        }
      }
    });
    macroViz.setEventRecorder(R);
    interpreter = new Interpreter(ast.sourceLoc, code, R);
    microViz.setEnv(interpreter.global.env);
    pathToSelectedEnvIdx = 0;
    envAtPathIdx = interpreter.global.env;
  }

  const done = interpreter.runForMillis(30);
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
    $(error).hide().delay(2000).slideDown().queue(() => editor.refresh());
  }
});

const sampleProgram = `"hello world".println();

(3 + 4).println();

var sum = 0;
for 1 to: 10 do: {x |
  sum = sum + x;
};
sum.println();`;
editor.setValue(localStorage.getItem('seymour-program') || sampleProgram);
