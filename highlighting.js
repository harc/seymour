// INTERACTIONS
// ============

// interactions in each section should be able to trigger all effects for 
// themselves and the other sections
// these are rows in the act-on/acted-on matrix

// macroViz
// --------

macroViz.addListener('click', (__, event, _) => focusLexicalStack(event));

macroViz.addListener('mouseover', (__, event, _) => {
  macroVizClearAllHover();
  macroVizHighlightHover(event);

  codeClearDef();
  codeHighlightDef(event.activationEnv.sourceLoc);

  codeClearRef();
  codeHighlightRef(event.sourceLoc);
});

macroViz.addListener('mouseout', (__, event, _) => {
  macroVizClearAllHover();
  codeClearDef();
  codeClearRef();
});


// microViz
// --------

microViz.addListener('click', (DOMEvent, event, view) => {
  if (DOMEvent.getModifierState('Meta') &&
      event instanceof SendEvent &&
      !view.isImplementation) {
    focusLexicalStack(event);
  }
});

microViz.addListener('mouseover', (_, event, view) => {
  if (event instanceof SendEvent && !view.isImplementation) {

    codeClearDef();
    codeHighlightDef(event.activationEnv.sourceLoc);

    codeClearRef();
    codeHighlightRef(event.sourceLoc);
    codeClearResultWidget();
    codeAddResultWidget(event);
    macroVizClearAllRef();
    macroVizHighlightRef(event);

    // TODO: may want to highlight more things, but this is enough for now
  }
});

microViz.addListener('mouseout', (_, event, view) => {
  codeClearDef();

  macroVizClearAllRef();
  codeClearRef();
  codeClearResultWidget();
});

// code
// ----


// TODO: this is gonna need some serious color work to be sensible
editor.getWrapperElement().onmousemove = e => {
  const highlightCode = e.getModifierState('Meta');
  const pos = editor.coordsChar({left: e.pageX, top: e.pageY});
  
  const event = mostSpecificEventContaining(pos);
  const defSourceLoc = event && event.activationEnv && event.activationEnv.sourceLoc;

  macroVizClearAllDef();
  macroVizHighlightDefsAt(pos);
  codeClearDef();
  if (highlightCode && defSourceLoc) {
    codeHighlightDef(defSourceLoc);
  }
  
  macroVizClearAllRefColors();
  let selectableCalls = macroVizHighlightRefsAt(pos, event, highlightCode);
  codeClearRef();
  if (highlightCode && event) {
    codeHighlightRef(event.sourceLoc);
  }

  codeClearFocusWidget(event && event.sourceLoc)
  if (highlightCode && event && event.activationEnv.sourceLoc) {
    codeAddFocusWidget(event.sourceLoc, selectableCalls);
  }
  
}
// TODO: hover + click - macro, micro focus

editor.on('cursorActivity', _ => {
  const pos = editor.doc.getCursor('head');

  macroVizClearAllDef();
  macroVizHighlightDefsAt(pos);

  macroVizClearAllRefColors();
  macroVizHighlightRefsAt(pos);
});

editor.getWrapperElement().onmouseout = _ => {
  macroVizClearAllDef();
  codeClearDef();

  macroVizClearAllRef();
  codeClearRef();
};

// HIGHER LEVEL EFFECTS AND UTILS
// ==============================

function focusLexicalStack(event) {
  pathMatchers = getPathMatchers(event.activationEnv);
  clearFocus();

  pathMatchers.forEach(path => { focusPath(path) });
}

function clearFocus() {
  macroVizClearAllFocus();
  microViz.setPaths(pathMatchers);
}

function focusPath(path) {
  macroVizHighlightFocus(path.env.programOrSendEvent);
  microVizFocus(path);
}

function mostSpecificEventContaining(pos) {
  const idx = editor.doc.indexFromPos(pos);
  let theEvent = null;
  macroViz.events.forEach(event => {
    if (!(event instanceof SendEvent)) return;

    if (event.sourceLoc && event.sourceLoc.containsIdx(idx)) {
      if (theEvent === null) {
        theEvent = event;
      } else if (theEvent.sourceLoc.strictlyContains(event.sourceLoc)) {
        theEvent = event;
      }
    }
  });
  return theEvent;
}

function macroVizHighlightDefsAt(pos) {
  const idx = editor.doc.indexFromPos(pos);

  macroViz.events.forEach(event => {
    if (!(event instanceof SendEvent)) return;
    if (event.activationEnv.sourceLoc &&
        event.activationEnv.sourceLoc.containsIdx(idx)) {
      macroVizHighlightDef(event);
    }
  });
}

const NUM_COLORS = 8;
const COLOR_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
function macroVizHighlightRefsAt(
    pos, mostSpecificEvent = null, colorDifferentCalls = false) {
  // if (colorDifferentCalls) debugger;
  const idx = editor.doc.indexFromPos(pos);

  let numSeen = 0;
  const selectableCalls = [];
  macroViz.events.forEach(event => {
    if (!(event instanceof SendEvent)) return;
    if (!event.sourceLoc) return;

    if (mostSpecificEvent &&
        event.sourceLoc.equals(mostSpecificEvent.sourceLoc)) {
      if (colorDifferentCalls && numSeen < NUM_COLORS) {
        macroVizHighlight(event, `ref-${numSeen + 1}`);
        selectableCalls.push(event);
        numSeen++;
      } else {
        macroVizHighlightRefSpecific(event);
      }
    } else if (event.sourceLoc.containsIdx(idx)) {
      if (event instanceof ProgramEvent) debugger;
      macroVizHighlightRef(event);
    }
  });

  return selectableCalls;
}

// UI utils
// ========

var resultWidget = null;

function codeAddResultWidget(event, sourceLoc = event.sourceLoc, value = null) {
  if (value === null) {
    value = event.hasOwnProperty('returnValue') ? 
        event._valueString(event.returnValue) : '?';
  }
  if (!sourceLoc) {
    return;
  }

  const startPos = editor.doc.posFromIndex(sourceLoc.startPos);
  const endPos = editor.doc.posFromIndex(sourceLoc.endPos);

  const widget = d('resultWidget', {}, '⇒ ' + value);
  editor.addWidget({line: endPos.line, ch: startPos.ch}, widget);
  resultWidget = widget;

  return widget;
}

function codeClearResultWidget() {
  if (resultWidget) { 
    $(resultWidget).remove(); 
  }
}


var focusWidget = null;
var selectableCalls = null;
var focusSourceLoc = null;

// TODO: maintain focuswidget on hover
// TODO: give clear a timeout
// TODO: maintain highlight on focus widget hover
function codeAddFocusWidget(sourceLoc, calls) {
  if (!sourceLoc) {
    return;
  }

  if (focusSourceLoc && sourceLoc.equals(focusSourceLoc)) {
    return;
  }

  const startPos = editor.doc.posFromIndex(sourceLoc.startPos);
  const endPos = editor.doc.posFromIndex(sourceLoc.endPos);

  const widget = renderFocusWidget(calls);
  editor.addWidget({line: endPos.line, ch: startPos.ch}, widget);
  focusWidget = widget;
  selectableCalls = calls;
  focusSourceLoc = sourceLoc;

  return widget;
}

function renderFocusWidget(calls) {
  const ans = d('focusWidget', {},
      ...calls.map((call, idx) => d('call', {class: `index-${idx}`}, '●')));

  ans.onmousemove = e => {
    calls.forEach((c, i) => {
      macroVizClear(c, `ref-${i+1}`)
      macroVizHighlight(c, `ref-${i+1}`)
    });
    e.stopPropagation()
  };

  ans.onmouseout = e => e.stopPropagation();

  calls.forEach((call, idx) => {
    const callDOM = ans.children[idx];
    callDOM.onmouseover = e => {
      calls.forEach((c, i) => {
        macroVizClear(c, `ref-${i+1}`)
      });
      macroVizHighlight(call, `ref-${idx+1}`);
    };

    callDOM.onmousemove = e => e.stopPropagation();

    callDOM.onclick = e => focusLexicalStack(call);
  });
  return ans;
}

function codeClearFocusWidget(sourceLoc) {
  if (focusWidget && 
      (sourceLoc === null || !sourceLoc.equals(focusSourceLoc))) { 
    $(focusWidget).remove(); 
  }
}

// LOW-LEVEL EFFECTS
// =================

// macroViz
// --------

var highlightedEvents = {};

function macroVizClearAll(highlightType = null, isPrefix = false) {
  if (!isPrefix) {
    const events = highlightType === null ?
        macroViz.events : highlightedEvents[highlightType] || [];
    events.forEach(event => macroVizClear(event, highlightType, false));

    if (highlightType) {
      highlightedEvents[highlightType] = [];
    }
  } else {
    Object.keys(highlightedEvents)
      .forEach(type => {
        if (type.startsWith(highlightType)) {
          macroVizClearAll(type, false);
        }
      });
  }
}

function macroVizClear(event, highlightType = null, isPrefix = false) {
  const view = macroViz.getNodeView(event);
  if (!view) return;
  if (highlightType !== null && !isPrefix) {
    view.DOM.classList.remove(`highlight-${highlightType}`);
  } else {
    const prefix = highlightType === null ? '' : highlightType;
    const classList = view.DOM.classList;
    for (let i = classList.length - 1; i >= 0; i--) {
      const cls = classList[i];
      if (cls.startsWith(`highlight-${prefix}`)) {
        classList.remove(cls)
      }
    }
  }
}

function macroVizHighlight(event, highlightType) {
  const view = macroViz.getNodeView(event);
  if (!view) return;
  view.DOM.classList.add(`highlight-${highlightType}`);

  if (!highlightedEvents.hasOwnProperty(highlightType)) {
    highlightedEvents[highlightType] = [];
  }
  highlightedEvents[highlightType].push(event);
}


var macroVizHighlightHover = _.partial(macroVizHighlight, _, 'hover', '');
var macroVizHighlightFocus = _.partial(macroVizHighlight, _, 'focus', '');
var macroVizHighlightDef = _.partial(macroVizHighlight, _, 'def', '');
var macroVizHighlightRef = _.partial(macroVizHighlight, _, 'ref', _);
var macroVizHighlightRefSpecific = _.partial(macroVizHighlight, _, 'ref-specific');

var macroVizClearAllFocus = _.partial(macroVizClearAll, 'focus', false);
var macroVizClearAllHover = _.partial(macroVizClearAll, 'hover', false);
var macroVizClearAllDef = _.partial(macroVizClearAll, 'def', false);
var macroVizClearAllRef = _.partial(macroVizClearAll, 'ref', false);
var macroVizClearAllRefColors = _.partial(macroVizClearAll, 'ref', true);

// microViz
// --------

function microVizFocus(path) {
  microViz.addImplementation(path.env.microVizEvents);
}

// code
// ----

var markers = {};

function codeHighlight(sourceLoc, highlightType) {
  if (!sourceLoc) {
    return;
  }
  const startPos = editor.doc.posFromIndex(sourceLoc.startPos);
  const endPos = editor.doc.posFromIndex(sourceLoc.endPos);
  markers[highlightType] = editor.doc.markText(startPos, endPos, {
    className: 'highlight-' + highlightType,
    clearOnEnter: true
  });
  return markers[highlightType];
}

function codeClear(highlightType) {
  if (markers[highlightType] != null) {
    markers[highlightType].clear();
    markers[highlightType] = null;
  }
}

var codeHighlightDef = _.partial(codeHighlight, _, 'def');
var codeHighlightRef = _.partial(codeHighlight, _, 'ref');

var codeClearDef = _.partial(codeClear, 'def');
var codeClearRef = _.partial(codeClear, 'ref');


