"use strict";

class AST {
  toInstruction(next) {
    throw new Error('abstract method');
  }

  toStmt() {
    return new ExpStmt(this);
  }
}

class Seq extends AST {
  constructor(asts) {
    super();
    this.asts = asts;
  }

  toInstruction(next) {
    return this.asts.reduceRight((rest, ast) => ast.toInstruction(rest), next);
  }
}

class VarDecl extends AST {
  constructor(name, expr) {
    super();
    this.name = name;
    this.expr = expr;
  }

  toInstruction(next) {
    return this.expr.toInstruction(new IDeclVar(this.name, next));
  }
}

class VarAssign extends AST {
  constructor(name, expr) {
    super();
    this.name = name;
    this.expr = expr;
  }

  toInstruction(next) {
    return this.expr.toInstruction(new IPopIntoVar(this.name, next));
  }
}

class InstVarAssign extends AST {
  constructor(name, expr) {
    super();
    this.name = name;
    this.expr = expr;
  }

  toInstruction(next) {
    return this.expr.toInstruction(new IPopIntoInstVar(this.name, next));
  }
}

class NonLocalReturn extends AST {
  constructor(value) {
    super();
    this.value = value;
  }

  toInstruction(next) {
    return this.value.toInstruction(new INonLocalReturn(next));
  }
}

class ExpStmt extends AST {
  constructor(exp) {
    super();
    this.exp = exp;
  }

  toInstruction(next) {
    return this.exp.toInstruction(new IDrop(next));
  }
}

class ClassDecl extends AST {
  constructor(name, superClassName, instVarNames) {
    super();
    this.name = name;
    this.superClassName = superClassName;
    this.instVarNames = instVarNames;
  }

  toInstruction(next) {
    return new IPushFromVar(this.superClassName,
      new IDeclClass(this.name, this.instVarNames, next));
  }
}

class MethodDecl extends AST {
  constructor(className, selector, formals, body) {
    super();
    this.className = className;
    this.selector = selector;
    this.formals = formals;
    this.body = body;
  }

  toInstruction(next) {
    return new IPushFromVar(this.className,
      new IDeclMethod(
        this.selector,
        this.formals,
        this.body.toInstruction(new IPushThis(new INonLocalReturn())),
        next));
  }
}

class Send extends AST {
  constructor(recv, sel, args) {
    super();
    this.recv = recv;
    this.sel = sel;
    this.args = args;
  }

  toInstruction(next) {
    return this.recv.toInstruction(
        this.args.reduceRight((rest, arg) => arg.toInstruction(rest),
            new ISend(this.sel, this.args.length, next)));
  }
}

class SuperSend extends AST {
  constructor(sel, args) {
    super();
    this.sel = sel;
    this.args = args;
  }

  toInstruction(next) {
    return this.args.reduceRight(
      (rest, arg) => arg.toInstruction(rest),
      new ISuperSend(this.sel, this.args.length, next));
  }
}

class Var extends AST {
  constructor(name) {
    super();
    this.name = name;
  }

  toInstruction(next) {
    return new IPushFromVar(this.name, next);
  }
}

class InstVar extends AST {
  constructor(name) {
    super();
    this.name = name;
  }

  toInstruction(next) {
    return new IPushFromInstVar(this.name, next);
  }
}

class LocalReturn extends AST {
  constructor(value) {
    super();
    this.value = value;
  }

  toInstruction(next) {
    return this.value.toInstruction(new ILocalReturn(next));
  }
}

class Block extends AST {
  constructor(formals, bodyExpr) {
    super();
    this.formals = formals;
    this.bodyExpr = bodyExpr;
  }

  toInstruction(next) {
    return new IBlock(this.formals, this.bodyExpr.toInstruction(new ILocalReturn()), next);
  }
}

// TODO: ArrayLit

class New extends AST {
  constructor(_class, args) {
    super();
    this.class = _class;
    this.args = args;
  }

  toInstruction(next) {
    return this.class.toInstruction(
      new INew(
        new IDup(
          this.args.reduceRight(
            (rest, arg) => arg.toInstruction(rest),
            new ISend('init', this.args.length, new IDrop(next))))));
  }
}

class Lit extends AST {
  constructor(value) {
    super();
    this.value = value;
  }

  toInstruction(next) {
    return new IPush(this.value, next);
  }
}

class This extends AST {
  constructor() {
    super();
  }

  toInstruction(next) {
    return new IPushThis(next);
  }
}
