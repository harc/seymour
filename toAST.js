const semantics = seymourGrammar.createSemantics();

semantics.addOperation('toAST()', {

  Program(declsAndStmts) {
    return new Seq(declsAndStmts.toAST());
  },

  Stmt_varDecl(_var, x, _eq, e, _sc) {
    return new VarDecl(x.toAST(), e.toAST());
  },

  Stmt_varAssign(x, _eq, e, _sc) {
    return new VarAssign(x.toAST(), e.toAST());
  },

  Stmt_instVarAssign(_this, _dot, x, _eq, e, _sc) {
    return new InstVarAssign(x.toAST(), e.toAST());
  },

  Stmt_return(_return, e, _sc) {
    return new NonLocalReturn(e.toAST());
  },

  Stmt_exp(e, _sc) {
    return new ExpStmt(e.toAST());
  },

  ClassDecl(_class, C, _optExtends, optS, _optWith, optXs, _sc) {
    return new ClassDecl(
       C.toAST(),
       optS.toAST()[0] || 'Object',
       optXs.toAST()[0] || []);
  },

  MethodDecl_java(_def, C, _dot, m, _op, xs, _cp, b) {
    return new MethodDecl(C.toAST(), m.toAST(), xs.toAST(), b.toAST());
  },

  MethodDecl_prefixKeyword(_def, pref, C, selParts, xs, b) {
    const selector = pref.toAST() + '_'  + selParts.toAST().join('_');
    return new MethodDecl(C.toAST(), selector, xs.toAST(), b.toAST());
  },

  MethodDecl_keyword(_def, C, selParts, xs, b) {
    const selector = selParts.toAST().map(p => '_' + p).join('');
    return new MethodDecl(C.toAST(), selector, xs.toAST(), b.toAST());
  },

  MethodDecl_binary(_def, C, m, x, b) {
    return new AMethodDecl(C.toAST(), m.toAST(), [x.toAST()], b.toAST());
  },

  MethodDecl_call(_def, C, _op, xs, _cp, b) {
    return new MethodDecl(C.toAST(), 'call', xs.toAST(), s.toAST(), b.toAST());
  },

  MethodBody_exp(_eq, e, _sc) {
    return new NonLocalReturn(e.toAST());
  },

  MethodBody_stmt(_oc, ss, _cc) {
    return new Seq(ss.toAST());
  },

  KWSendExp_prefixKeyword(pref, e, sps, es) {
    const selector = pref.toAST() + '_'  + sps.toAST().join('_');
    return new Send(e.toAST(), selector, es.toAST());
  },

  KWSendExp_keyword(e, sps, es) {
    const selector = sps.toAST().map(p => '_' + p).join('');
    return new Send(e.toAST(), selector, es.toAST());
  },

  KWSendExp_super(_super, sps, es) {
    const selector = sps.toAST().reduce((m, sp) => m + sp.charAt(0).toUpperCase() + sp.substr(1));
    return new SuperSend(selector, es.toAST());
  },

  EqExp_eq(x, op, y) {
    return new Send(x.toAST(), op.toAST(), [y.toAST()]);
  },

  RelExp_rel(x, op, y) {
    return new Send(x.toAST(), op.toAST(), [y.toAST()]);
  },

  AddExp_add(x, op, y) {
    return new Send(x.toAST(), op.toAST(), [y.toAST()]);
  },

  MulExp_mul(x, op, y) {
    return new Send(x.toAST(), op.toAST(), [y.toAST()]);
  },

  DotExp_call(b, _op, es, _cp) {
    return new Send(b.toAST(), 'call', es.toAST());
  },

  DotExp_send(e, _dot, m, _op, es, _cp) {
    return new Send(e.toAST(), m.toAST(), es.toAST());
  },

  DotExp_superSend(_super, _dot, m, _op, es, _cp) {
    return new SuperSend(m.toAST(), es.toAST());
  },

  DotExp_instVarAccess(_this, _dot, x) {
    return new InstVar(x.toAST());
  },

  UnExp_neg(_minus, x) {
    return new Send(new Lit(0), '-', [x.toAST()]);
  },

  PriExp_paren(_op, e, _cp) {
    return e.toAST();
  },

  PriExp_block(_oc, optXs, ss, optE, _cc) {
    const xs = optXs.toAST()[0] || [];
    const body = ss.toAST();
    const e = optE.toAST()[0];
    body.push(new LocalReturn(e || new Lit(null)));
    return new Block(xs, new Seq(body));
  },

  PriExp_array(_os, es, _cs) {
    return new ArrayLit(es.toAST());
  },

  PriExp_new(_new, C, _op, es, _cp) {
    return new New(C.toAST(), es.toAST());
  },

  PriExp_str(s) {
    return new Lit(s.toAST());
  },

  PriExp_var(x) {
    return new Var(x.toAST());
  },

  PriExp_class(C) {
    return new Var(C.toAST());
  },

  PriExp_number(_) {
    return new Lit(parseFloat(this.sourceString));
  },

  PriExp_this(_) {
    return new This();
  },

  PriExp_true(_) {
    return new Lit(true);
  },

  PriExp_false(_) {
    return new Lit(false);
  },

  PriExp_null(_) {
    return new Lit(null);
  },

  BlockArgNames(xs, _bar) {
    return xs.toAST();
  },

  varName(_first, _rest) {
    return this.sourceString;
  },

  className(_first, _rest) {
    return this.sourceString;
  },

  kwSelectorPart(ident, _colon) {
    return ident.sourceString;
  },

  string(_oq, cs, _cq) {
    const chars = [];
    var idx = 0;
    cs = cs.toAST();
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
  },

  NonemptyListOf(x, _seps, xs) {
    return [x.toAST()].concat(xs.toAST());
  },

  EmptyListOf() {
    return [];
  },

  _terminal() {
    return this.sourceString;
  }

});

function toAST(matchResult) {
  if (matchResult.succeeded()) {
    return semantics(matchResult).toAST();
  } else {
    throw new Error(matchResult.message);
  }
}
