"use strict";

const DEBUG = false;
console.debug = function(...args) {
  if (DEBUG) {
    console.log(...args);
  }
};

let interpreter;
let timeoutId;

function run(optCode) {
  if (optCode) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    Obj.nextId = 0;
    interpreter = new Interpreter(optCode);
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

const editor = CodeMirror.fromTextArea(myTextArea, { lineNumbers: true });

editor.on('beforeChange', function(cmInstance, changeObj) {
  var insertedText = changeObj.text.join('\n');
  var fromIdx = editor.indexFromPos(changeObj.from);
  var toIdx = editor.indexFromPos(changeObj.to);
  m.replaceInputRange(fromIdx, toIdx, insertedText);
});

editor.on('change', function(cmInstance, changeObj) {
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
    run(code);
  } else {
    const expected = r.getExpectedText();
    const pos = editor.doc.posFromIndex(r.getRightmostFailurePosition());
    const error = document.createElement('parseError');
    error.innerText = spaces(pos.ch) + '^\nExpected: ' + expected;
    parseErrorWidget = editor.addLineWidget(pos.line, error);
    $(error).hide().delay(2000).slideDown().queue(() => editor.refresh());
  }

  function spaces(n) {
    let str = '';
    while (n-- > 0) {
      str += ' ';
    }
    return str;
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
