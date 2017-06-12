"use strict";

const syntaxHighlight = (function() {

  const semantics = seymourGrammar.createSemantics();
  let doc;

  function syntaxHighlight(cm, matcher) {
    doc = cm.doc;
    doc.getAllMarks().forEach(mark => mark.clear());
    const matchResult = matcher.match('tokens');
    semantics(matchResult).syntaxHighlight();
  }

  function mark(startIdx, endIdx, className) {
    const startPos = doc.posFromIndex(startIdx);
    const endPos = doc.posFromIndex(endIdx);
    const marke = doc.markText(startPos, endPos, { className: 'sh_' + className });
  }

  semantics.addOperation('syntaxHighlight()', {

    tokens(children) {
      children.syntaxHighlight();
    },

    token(children) {
      if (this.numChildren !== 1) {
        throw new Error('token cst nodes should only have one child');
      }
      this.child(0).syntaxHighlight();
    },

    valueToken(t) {
      return t.syntaxHighlight();
    },

    instVarAccess(_dot, _spaces, name) {
      mark(name.source.startIdx, name.source.endIdx, 'instVarName');
    },

    javaStyleSelector(_dot, _spaces1, selector, _spaces2, _open) {
      mark(selector.source.startIdx, selector.source.endIdx, 'selector');
    },

    kwSelectorPrefix(prefix, _spaces, _receiverToken) {
      mark(prefix.source.startIdx, prefix.source.endIdx, 'selector');
    },

    kwSelectorPart(selector, colon) {
      mark(selector.source.startIdx, colon.source.endIdx, 'selector');
    },

    _nonterminal(children) {
      if (this.ctorName !== 'any') {
        mark(this.source.startIdx, this.source.endIdx, this.ctorName);
      }
    }

  });

  return syntaxHighlight;

})();
