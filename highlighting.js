const NUM_COLORS = 8;
const COLOR_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// interactions in each section should be able to trigger all effects for 
// themselves and the other sections
// these are rows in the act-on/acted-on matrix

class Highlighting {
  constructor(globalState, enableHighlighting) {
    this.globalState = globalState;
    this.enableHighlighting = enableHighlighting;

    this.registerListenersMacroViz();
    this.registerListenersMicroViz();
    this.registerListenersCode();

    // UI state

    this.resultWidget = null;

    this.focusWidget = null;
    this.selectableCalls = null;
    this.focusSourceLoc = null;

    // low level effect state

    // macroViz
    this.highlightedEvents = {};

    // code
    this.markers = {};

    this.partials();
  }

  partials() {
    this.macroVizHighlightHover = 
        _.partial(Highlighting.prototype.macroVizHighlight, _, 'hover', '');
    this.macroVizHighlightFocus = 
        _.partial(Highlighting.prototype.macroVizHighlight, _, 'focus', '');
    this.macroVizHighlightDef = 
        _.partial(Highlighting.prototype.macroVizHighlight, _, 'def', '');
    this.macroVizHighlightRef = 
        _.partial(Highlighting.prototype.macroVizHighlight, _, 'ref', _);
    this.macroVizHighlightRefSpecific = 
        _.partial(Highlighting.prototype.macroVizHighlight, _, 'ref-specific');

    this.macroVizClearAllFocus = 
        _.partial(Highlighting.prototype.macroVizClearAll, 'focus', false);
    this.macroVizClearAllHover = 
        _.partial(Highlighting.prototype.macroVizClearAll, 'hover', false);
    this.macroVizClearAllDef = 
        _.partial(Highlighting.prototype.macroVizClearAll, 'def', false);
    this.macroVizClearAllRef = 
        _.partial(Highlighting.prototype.macroVizClearAll, 'ref', false);
    this.macroVizClearAllRefColors = 
        _.partial(Highlighting.prototype.macroVizClearAll, 'ref', true);

    // code partials

    this.codeHighlightDef = 
        _.partial(Highlighting.prototype.codeHighlight, _, 'def');
    this.codeHighlightRef = 
        _.partial(Highlighting.prototype.codeHighlight, _, 'ref');

    this.codeClearDef = 
        _.partial(Highlighting.prototype.codeClear, 'def');
    this.codeClearRef = 
        _.partial(Highlighting.prototype.codeClear, 'ref');
  }

  get macroViz() { return this.globalState.macroViz; }
  get microViz() { return this.globalState.microViz; }
  get editor() { return this.microViz.editor; }

  // INTERACTIONS
  // ============

  registerListenersMacroViz() {
    if (!this.macroViz) {
      return;
    }

    this.macroViz.addListener('click', (__, event, _) => {
        this.focusLexicalStack(event)
    });

    if (this.enableHighlighting) {
      this.macroViz.addListener('mouseover', (__, event, _) => {
        this.macroVizClearAllHover();
        this.macroVizHighlightHover(event);

        this.codeClearDef();
        this.codeHighlightDef(event.activationEnv.sourceLoc);

        this.codeClearRef();
        this.codeHighlightRef(event.sourceLoc);
      });
    }

    this.macroViz.addListener('mouseout', (__, event, _) => {
      this.macroVizClearAllHover();
      this.codeClearDef();
      this.codeClearRef();
    });
  }

  registerListenersMicroViz() {
    this.microViz.addListener('click', (DOMEvent, event, view) => {
      if (DOMEvent.getModifierState('Meta') &&
          event instanceof SendEvent &&
          !view.isImplementation) {
        this.focusLexicalStack(event);
      }
    });

    if (this.enableHighlighting) {
      this.microViz.addListener('mouseover', (_, event, view) => {
        if (event instanceof SendEvent && !view.isImplementation) {

          this.codeClearDef();
          this.codeHighlightDef(event.activationEnv.sourceLoc);

          this.codeClearRef();
          this.codeHighlightRef(event.sourceLoc);
          this.codeClearResultWidget();
          if (event.selector !== 'enterNewScope') {
            this.codeAddResultWidget(event);
          }
          this.macroVizClearAllRef();
          if (this.macroViz) {
            this.macroVizHighlightRef(event);
          }

          // TODO: may want to highlight more things, but this is enough for now
        }
      });
    }

    this.microViz.addListener('mouseout', (_, event, view) => {
      this.codeClearDef();

      this.macroVizClearAllRef();
      this.codeClearRef();
      this.codeClearResultWidget();
    });
  }

  registerListenersCode() {
    if (!this.enableHighlighting) {
      return;
    }
    // TODO: this is gonna need some serious color work to be sensible
    this.editor.getWrapperElement().onmousemove = e => {
      const highlightCode = e.getModifierState('Meta');
      const pos = this.editor.coordsChar({left: e.pageX, top: e.pageY});
      
      const event = this.mostSpecificEventContaining(pos);
      const defSourceLoc = event && event.activationEnv && event.activationEnv.sourceLoc;

      this.macroVizClearAllDef();
      if (this.macroViz) {
        this.macroVizHighlightDefsAt(pos);
      }
      this.codeClearDef();
      if (highlightCode && defSourceLoc) {
        this.codeHighlightDef(defSourceLoc);
      }
      
      this.macroVizClearAllRefColors();
      let selectableCalls = null;
      if (this.macroViz) {
        selectableCalls = this.macroVizHighlightRefsAt(
              pos, event, highlightCode && defSourceLoc);
      }
      this.codeClearRef();
      if (highlightCode && event) {
        this.codeHighlightRef(event.sourceLoc);
      }

      this.codeClearFocusWidget(event && event.sourceLoc)
      if (highlightCode && event && event.activationEnv.sourceLoc) {
        this.codeAddFocusWidget(event.sourceLoc, pos, selectableCalls);
      }
      
    }
    // TODO: hover + click - macro, micro focus

    this.editor.on('cursorActivity', _ => {
      const pos = this.editor.doc.getCursor('head');

      this.macroVizClearAllDef();
      if (this.macroViz) {
        this.macroVizHighlightDefsAt(pos);
      }

      this.macroVizClearAllRefColors();
      if (this.macroViz) {
        this.macroVizHighlightRefsAt(pos);
      }
    });

    this.editor.getWrapperElement().onmouseout = _ => {
      this.macroVizClearAllDef();
      this.codeClearDef();

      this.macroVizClearAllRef();
      this.codeClearRef();
    };
  }

  // HIGHER LEVEL EFFECTS AND UTILS
  // ==============================

  focusLexicalStack(event) {
    this.globalState.pathMatchers = getPathMatchers(event.activationEnv);
    this.clearFocus();

    this.globalState.pathMatchers.forEach(path => { this.focusPath(path) });
  }

  clearFocus() {
    this.macroVizClearAllFocus();
    this.globalState.microViz.setPaths(this.globalState.pathMatchers);
  }

  focusPath(path) {
    if (this.macroViz) {
      this.macroVizHighlightFocus(path.env.programOrSendEvent);
    }
    this.microVizFocus(path);
  }

  mostSpecificEventContaining(pos) {
    const idx = this.editor.doc.indexFromPos(pos);
    let theEvent = null;
    if (!this.macroViz) {
      return null;
    }
    this.macroViz.events.forEach(event => {
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

  macroVizHighlightDefsAt(pos) {
    const idx = this.editor.doc.indexFromPos(pos);

    this.macroViz.events.forEach(event => {
      if (!(event instanceof SendEvent)) return;
      if (event.activationEnv.sourceLoc &&
          event.activationEnv.sourceLoc.containsIdx(idx)) {
        this.macroVizHighlightDef(event);
      }
    });
  }

  macroVizHighlightRefsAt(pos, mostSpecificEvent = null, colorDifferentCalls = false) {
    const idx = this.editor.doc.indexFromPos(pos);

    let numSeen = 0;
    const selectableCalls = [];
    this.macroViz.events.forEach(event => {
      if (!(event instanceof SendEvent)) return;
      if (!event.sourceLoc) return;

      if (mostSpecificEvent &&
          event.sourceLoc.equals(mostSpecificEvent.sourceLoc)) {
        if (colorDifferentCalls && numSeen < NUM_COLORS) {
          this.macroVizHighlight(event, `ref-${numSeen + 1}`);
          selectableCalls.push(event);
          numSeen++;
        } else {
          this.macroVizHighlightRefSpecific(event);
        }
      } else if (event.sourceLoc.containsIdx(idx)) {
        this.macroVizHighlightRef(event);
      }
    });

    return selectableCalls;
  }

  // UI utils
  // ========

  codeAddResultWidget(event, sourceLoc = event.sourceLoc, value = null) {
    if (value === null) {
      value = event.hasOwnProperty('returnValue') ? 
          event._valueString(event.returnValue) : '?';
    }
    if (!sourceLoc) {
      return;
    }

    const startPos = this.editor.doc.posFromIndex(sourceLoc.startPos);
    const endPos = this.editor.doc.posFromIndex(sourceLoc.endPos);

    const widget = d('resultWidget', {}, '⇒ ' + value);
    this.editor.addWidget({line: endPos.line, ch: startPos.ch}, widget);
    this.resultWidget = widget;

    return widget;
  }

  codeClearResultWidget() {
    if (this.resultWidget) { 
      $(this.resultWidget).remove(); 
    }
  }

  codeAddFocusWidget(sourceLoc, mousePos, calls) {
    if (!sourceLoc) {
      return;
    }

    if (this.focusSourceLoc && sourceLoc.equals(this.focusSourceLoc)) {
      return;
    }

    const startPos = this.editor.doc.posFromIndex(sourceLoc.startPos);
    const endPos = this.editor.doc.posFromIndex(sourceLoc.endPos);

    const widget = this.renderFocusWidget(calls);
    this.editor.addWidget({line: endPos.line, ch: mousePos.ch}, widget);
    this.focusWidget = widget;
    this.selectableCalls = calls;
    this.focusSourceLoc = sourceLoc;

    return widget;
  }

  renderFocusWidget(calls) {
    const ans = d('focusWidget', {},
        ...calls.map((call, idx) => d('call', {class: `index-${idx}`}, '●')));

    ans.onmousemove = e => {
      calls.forEach((c, i) => {
        this.macroVizClear(c, `ref-${i+1}`)
        this.macroVizHighlight(c, `ref-${i+1}`)
      });
      e.stopPropagation()
    };

    ans.onmouseout = e => e.stopPropagation();

    calls.forEach((call, idx) => {
      const callDOM = ans.children[idx];
      callDOM.onmouseover = e => {
        calls.forEach((c, i) => {
          this.macroVizClear(c, `ref-${i+1}`)
        });
        this.macroVizHighlight(call, `ref-${idx+1}`);
      };

      callDOM.onmousemove = e => e.stopPropagation();

      callDOM.onclick = e => this.focusLexicalStack(call);
    });
    return ans;
  }

  codeClearFocusWidget(sourceLoc) {
    if (this.focusWidget && 
        (sourceLoc === null || !sourceLoc.equals(this.focusSourceLoc))) { 
      $(this.focusWidget).remove(); 
      this.focusWidget = null;
      this.selectableCalls = null;
      this.focusSourceLoc = null;
    }
  }

  // LOW-LEVEL EFFECTS
  // =================

  // macroViz
  // --------

  macroVizClearAll(highlightType = null, isPrefix = false) {
    if (!isPrefix) {
      const events = highlightType === null ?
          this.macroViz.events : this.highlightedEvents[highlightType] || [];
      events.forEach(event => this.macroVizClear(event, highlightType, false));

      if (highlightType) {
        this.highlightedEvents[highlightType] = [];
      }
    } else {
      Object.keys(this.highlightedEvents)
        .forEach(type => {
          if (type.startsWith(highlightType)) {
            this.macroVizClearAll(type, false);
          }
        });
    }
  }

  macroVizClear(event, highlightType = null, isPrefix = false) {
    const view = this.macroViz.getNodeView(event);
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

  macroVizHighlight(event, highlightType) {
    const view = this.macroViz.getNodeView(event);
    if (!view) return;
    view.DOM.classList.add(`highlight-${highlightType}`);

    if (!this.highlightedEvents.hasOwnProperty(highlightType)) {
      this.highlightedEvents[highlightType] = [];
    }
    this.highlightedEvents[highlightType].push(event);
  }

  // microViz
  // --------

  microVizFocus(path) {
    this.microViz.addImplementation(path.env.microVizEvents);
  }

  // code
  // ----

  codeHighlight(sourceLoc, highlightType) {
    if (!sourceLoc) {
      return;
    }
    const startPos = this.editor.doc.posFromIndex(sourceLoc.startPos);
    const endPos = this.editor.doc.posFromIndex(sourceLoc.endPos);
    this.markers[highlightType] = this.editor.doc.markText(startPos, endPos, {
      className: 'highlight-' + highlightType,
      clearOnEnter: true
    });
    return this.markers[highlightType];
  }

  codeClear(highlightType) {
    if (this.markers[highlightType] != null) {
      this.markers[highlightType].clear();
      this.markers[highlightType] = null;
    }
  }

  // TODO: partials
}
