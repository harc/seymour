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

    macroVizClearAllRef();
    macroVizHighlightRef(event);
    codeClearRef();
    codeHighlightRef(event.sourceLoc);
    codeClearResultWidget();
    codeAddResultWidget(event);

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
  const pos = editor.coordsChar({left: e.pageX, top: e.pageY});
  
  const event = mostSpecificEventContaining(pos);
  const defSourceLoc = event && event.activationEnv && event.activationEnv.sourceLoc;

  macroVizClearAllDef();
  macroVizHighlightDefsAt(pos);
  if (defSourceLoc) {
    codeClearDef();
    codeHighlightDef(defSourceLoc);
  }
  
  macroVizClearAllRefColors();
  macroVizHighlightRefsAt(pos, event);
  if (event) {
    codeClearRef();
    codeHighlightRef(event.sourceLoc);
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

function macroVizHighlightRefsAt(
    pos, mostSpecificEvent = null, colorDifferentCalls = false) {
  const idx = editor.doc.indexFromPos(pos);

  macroViz.events.forEach(event => {
    if (!(event instanceof SendEvent)) return;
    if (!event.sourceLoc) return;

    if (mostSpecificEvent &&
        event.sourceLoc.equals(mostSpecificEvent.sourceLoc)) {
      // TODO: color different calls
      macroVizHighlightRefSpecific(event);
    } else if (event.sourceLoc.containsIdx(idx)) {
      if (event instanceof ProgramEvent) debugger;
      macroVizHighlightRef(event);
    }
  });
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
  markers[highlightType] = editor.doc.markText(startPos, endPos, {className: 'highlight-' + highlightType});
  return markers[highlightType];
}

function codeClear(highlightType) {
  if (markers[highlightType]) {
    markers[highlightType].clear();
    markers[highlightType] = null;
  }
}

var codeHighlightDef = _.partial(codeHighlight, _, 'def');
var codeHighlightRef = _.partial(codeHighlight, _, 'ref');

var codeClearDef = _.partial(codeClear, 'def');
var codeClearRef = _.partial(codeClear, 'ref');


