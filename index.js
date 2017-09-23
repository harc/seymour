"use strict";

// TODO: factor out some of this UI logic

const DEBUG = false;
console.debug = function(...args) {
  if (DEBUG) {
    console.log(...args);
  }
};

// -----

// const S = new Seymour(microVizContainer, macroVizContainer);

const S = new Python(microVizContainer, macroVizContainer);

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
