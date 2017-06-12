const semantics = seymourGrammar.createSemantics();

let programSource;
let lineNumbers = [];

semantics.addOperation('toAST()', {

  Program(declsAndStmts) {
    programSource = this.sourceString;
    let currLineNumber = 1;
    for (let pos = 0; pos < programSource.length; pos++) {
      lineNumbers[pos] = currLineNumber;
      if (programSource[pos] === '\n') {
        currLineNumber++;
      }
    }
    return new Seq(this.sourceLoc(), declsAndStmts.toAST());
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
        es.toAST());
  },

  KWSendExp_keyword(e, selParts, es) {
    return new Send(this.sourceLoc(), e.toAST(), selParts.toIdent(), es.toAST());
  },

  KWSendExp_super(_super, selParts, es) {
    return new SuperSend(this.sourceLoc(), selParts.toIdent(), es.toAST());
  },

  EqExp_eq(x, op, y) {
    return new Send(this.sourceLoc(), x.toAST(), [op.toIdent()], [y.toAST()]);
  },

  RelExp_rel(x, op, y) {
    return new Send(this.sourceLoc(), x.toAST(), [op.toIdent()], [y.toAST()]);
  },

  AddExp_add(x, op, y) {
    return new Send(this.sourceLoc(), x.toAST(), [op.toIdent()], [y.toAST()]);
  },

  MulExp_mul(x, op, y) {
    return new Send(this.sourceLoc(), x.toAST(), [op.toIdent()], [y.toAST()]);
  },

  DotExp_call(b, _op, es, _cp) {
    return new Send(this.sourceLoc(), b.toAST(), [new Ident(_op.sourceLoc(), 'call')], es.toAST());
  },

  DotExp_send(e, _dot, m, _op, es, _cp) {
    return new Send(this.sourceLoc(), e.toAST(), [m.toIdent()], es.toAST());
  },

  DotExp_superSend(_super, _dot, m, _op, es, _cp) {
    return new SuperSend(this.sourceLoc(), [m.toIdent()], es.toAST());
  },

  DotExp_instVarAccess(_this, _dot, x) {
    return new InstVar(this.sourceLoc(), x.toIdent());
  },

  UnExp_neg(_minus, x) {
    return new Send(this.sourceLoc(), new Lit(null, 0), [_minus.toIdent()], [x.toAST()]);
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
    return new New(this.sourceLoc(), C.toAST(), es.toAST());
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
    var idx = 0;
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

function createSourceLoc(startPos, endPos) {
  return new SourceLoc(startPos, endPos, lineNumbers[startPos], lineNumbers[endPos]);
}

function toAST(matchResult) {
  if (matchResult.succeeded()) {
    return semantics(matchResult).toAST();
  } else {
    throw new Error(matchResult.message);
  }
}
