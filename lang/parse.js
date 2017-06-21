"use strict";

const parse = (function() {

  const semantics = seymourGrammar.createSemantics();

  let programSource;
  let lineNumbers;

  semantics.addOperation('toAST()', {

    Program(declsAndStmts) {
      lineNumbers = [];
      let currLineNumber = 1;
      for (let pos = 0; pos < programSource.length; pos++) {
        lineNumbers[pos] = currLineNumber;
        if (programSource[pos] === '\n') {
          currLineNumber++;
        }
      }
      lineNumbers[programSource.length] = currLineNumber;
      return new Seq(
          new SourceLoc(0, programSource.length, 1, currLineNumber),
          declsAndStmts.toAST());
    },

    Stmt_varDecl(_var, x, _eq, e, _sc) {
      return new VarDecl(this.sourceLoc(), x.toIdent(), e.toAST());
    },

    Stmt_varAssign(x, _eq, e, _sc) {
      return new VarAssign(this.sourceLoc(), x.toIdent(), e.toAST());
    },

    Stmt_instVarAssign(_this, _dot, x, _eq, e, _sc) {
      return new InstVarAssign(this.sourceLoc(), x.toIdent(), e.toAST());
    },

    Stmt_return(_return, e, _sc) {
      return new NonLocalReturn(this.sourceLoc(), e.toAST());
    },

    Stmt_exp(e, _sc) {
      return new ExpStmt(this.sourceLoc(), e.toAST());
    },

    Stmt_js(_oc, _codeChars, _cp) {
      var code = this.sourceString.substring(2, this.sourceString.length - 2);
      return new JSPrim(this.sourceLoc(), code);
    },

    ClassDecl(_class, C, _optExtends, optS, _optWith, optXs, _sc) {
      return new ClassDecl(
         this.sourceLoc(),
         C.toIdent(),
         optS.toIdent()[0] || new Ident(null, 'Object'),
         optXs.toIdent()[0] || []);
    },

    MethodDecl_java(_def, C, _dot, m, _op, xs, _cp, b) {
      return new MethodDecl(this.sourceLoc(), C.toIdent(), [m.toIdent()], xs.toIdent(), b.toAST());
    },

    MethodDecl_prefixKeyword(_def, pref, C, selParts, xs, b) {
      return new MethodDecl(
          this.sourceLoc(),
          C.toIdent(),
          [pref.toIdent(), new Ident(null, '_')].concat(selParts.toIdent()),
          xs.toIdent(),
          b.toAST());
    },

    MethodDecl_keyword(_def, C, selParts, xs, b) {
      return new MethodDecl(
          this.sourceLoc(),
          C.toIdent(),
          selParts.toIdent(),
          xs.toIdent(),
          b.toAST());
    },

    MethodDecl_binary(_def, C, m, x, b) {
      return new MethodDecl(this.sourceLoc(), C.toIdent(), [m.toIdent()], [x.toIdent()], b.toAST());
    },

    MethodDecl_call(_def, C, _op, xs, _cp, b) {
      return new MethodDecl(
          this.sourceLoc(),
          C.toIdent(),
          [new Ident(_op.sourceLoc(), 'call')],
          xs.toIdent(),
          b.toAST());
    },

    MethodBody_exp(_eq, e, _sc) {
      return new NonLocalReturn(this.sourceLoc(), e.toAST());
    },

    MethodBody_stmt(_oc, ss, _cc) {
      return new Seq(this.sourceLoc(), ss.toAST());
    },

    KWSendExp_prefixKeyword(pref, e, selParts, es) {
      return new Send(
          this.sourceLoc(),
          e.toAST(),
          [pref.toIdent(), new Ident(null, '_')].concat(selParts.toIdent()),
          es.toAST(),
          pref.toActivationPathToken());
    },

    KWSendExp_keyword(e, selParts, es) {
      return new Send(
          this.sourceLoc(),
          e.toAST(),
          selParts.toIdent(),
          es.toAST(),
          selParts.toActivationPathToken()[0]);
    },

    KWSendExp_super(_super, selParts, es) {
      return new SuperSend(
          this.sourceLoc(),
          selParts.toIdent(),
          es.toAST(),
          _super.toActivationPathToken());
    },

    EqExp_eq(x, op, y) {
      return new Send(
          this.sourceLoc(), x.toAST(),
          [op.toIdent()],
          [y.toAST()],
          op.toActivationPathToken());
    },

    RelExp_rel(x, op, y) {
      return new Send(
          this.sourceLoc(),
          x.toAST(),
          [op.toIdent()],
          [y.toAST()],
          op.toActivationPathToken());
    },

    AddExp_add(x, op, y) {
      return new Send(
          this.sourceLoc(),
          x.toAST(),
          [op.toIdent()],
          [y.toAST()],
          op.toActivationPathToken());
    },

    MulExp_mul(x, op, y) {
      return new Send(
          this.sourceLoc(),
          x.toAST(),
          [op.toIdent()],
          [y.toAST()],
          op.toActivationPathToken());
    },

    DotExp_call(b, op, es, _cp) {
      return new Send(
          this.sourceLoc(),
          b.toAST(),
          [new Ident(null, 'call')],
          es.toAST(),
          op.toActivationPathToken());
    },

    DotExp_send(e, dot, m, _op, es, _cp) {
      return new Send(
          this.sourceLoc(),
          e.toAST(),
          [m.toIdent()],
          es.toAST(),
          dot.toActivationPathToken());
    },

    DotExp_superSend(_super, dot, m, _op, es, _cp) {
      return new SuperSend(
          this.sourceLoc(),
          [m.toIdent()],
          es.toAST(),
          dot.toActivationPathToken());
    },

    DotExp_instVarAccess(_this, _dot, x) {
      return new InstVar(this.sourceLoc(), x.toIdent());
    },

    UnExp_neg(minus, x) {
      return new Send(
          this.sourceLoc(),
          new Lit(null, 0),
          [minus.toIdent()],
          [x.toAST()],
          minus.toActivationPathToken());
    },

    PriExp_paren(_op, e, _cp) {
      return e.toAST();
    },

    PriExp_block(_oc, optXs, ss, optE, _cc) {
      const xs = optXs.toIdent()[0] || [];
      const body = ss.toAST();
      const e = optE.toAST()[0];
      const returnExp = e || new Lit(null, null);
      body.push(new LocalReturn(returnExp.sourceLoc, returnExp));
      return new Block(this.sourceLoc(), xs, new Seq(null, body));
    },

    PriExp_array(_os, es, _cs) {
      return new ArrayLit(this.sourceLoc(), es.toAST());
    },

    PriExp_new(_new, C, _op, es, _cp) {
      return new New(this.sourceLoc(), C.toAST(), es.toAST(), _new.toActivationPathToken());
    },

    PriExp_str(s) {
      return new Lit(this.sourceLoc(), s.stringValue());
    },

    PriExp_var(x) {
      return new Var(this.sourceLoc(), x.sourceString);
    },

    PriExp_class(C) {
      return new Var(this.sourceLoc(), C.sourceString);
    },

    PriExp_number(_) {
      return new Lit(this.sourceLoc(), parseFloat(this.sourceString));
    },

    PriExp_this(_) {
      return new This(this.sourceLoc());
    },

    PriExp_true(_) {
      return new Lit(this.sourceLoc(), true);
    },

    PriExp_false(_) {
      return new Lit(this.sourceLoc(), false);
    },

    PriExp_null(_) {
      return new Lit(this.sourceLoc(), null);
    },

    NonemptyListOf(x, _seps, xs) {
      return [x.toAST()].concat(xs.toAST());
    },

    EmptyListOf() {
      return [];
    }

  });

  semantics.addOperation('toIdent()', {

    _nonterminal(children) {
      return new Ident(this.sourceLoc(), this.sourceString);
    },

    _terminal() {
      return new Ident(this.sourceLoc(), this.sourceString);
    },

    BlockArgNames(xs, _bar) {
      return xs.toIdent();
    },

    ListOf(x) {
      return x.toIdent();
    },

    NonemptyListOf(x, _seps, xs) {
      return [x.toIdent()].concat(xs.toIdent());
    },

    EmptyListOf() {
      return [];
    }

  });

  semantics.addOperation('toActivationPathToken()', {

    _nonterminal(children) {
      return this._node;
    },

    _terminal() {
      return this._node;
    }

  });

  semantics.addOperation('sourceLoc()', {

    _nonterminal(children) {
      return createSourceLoc(this.source.startIdx, this.source.endIdx);
    },

    _terminal() {
      return createSourceLoc(this.source.startIdx, this.source.endIdx);
    },

    ListOf(x) {
      return x.sourceLoc();
    },

    NonemptyListOf(x, _seps, xs) {
      return [x.sourceLoc()].concat(xs.sourceLoc());
    },

    EmptyListOf() {
      return [];
    }

  });

  semantics.addOperation('stringValue()', {

    string(_oq, cs, _cq) {
      const chars = [];
      let idx = 0;
      cs = cs.sourceString;
      while (idx < cs.length) {
        let c = cs[idx++];
        if (c === '\\' && idx < cs.length) {
          c = cs[idx++];
          switch (c) {
            case 'n': c = '\n'; break;
            case 't': c = '\t'; break;
            default: idx--;
          }
        }
        chars.push(c);
      }
      return chars.join('');
    }

  });

  let includeSourceLocs;

  function createSourceLoc(startPos, endPos) {
    return includeSourceLocs ?
        new SourceLoc(startPos, endPos, lineNumbers[startPos], lineNumbers[endPos]) :
        null;
  }

  function parse(matchResult, optIncludeSourceLocs) {
    includeSourceLocs = arguments.length === 1 ? true : !!optIncludeSourceLocs;
    if (matchResult.succeeded()) {
      programSource = matchResult.input;
      return semantics(matchResult).toAST();
    } else {
      throw new Error(matchResult.message);
    }
  }

  return parse;
})();
