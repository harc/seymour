"use strict";

class Activation {
  constructor(args, formals, parent, caller, sourceLoc, code) {
    if (caller) {
      this.R = caller.R;
      this.env = this.R.mkEnv(sourceLoc, parent.env, caller.env);
    }
    this.args = args;
    this.varDeclActivations = Object.create(parent === null ? null : parent.varDeclActivations);
    this.varValues = Object.create(null);
    if (args.length < formals.length) {
      throw new Error('not enough arguments');
    }
    this.formals = formals;
    this.parent = parent;
    this.caller = caller;
    this.sourceLoc = sourceLoc;
    this.stack = [];
    this.nextInstruction = code;
  }

  declareFormals() {
    this.formals.forEach(
        (formal, idx) => this.declVar(formal.sourceLoc, formal.name, this.args[idx]));
  }

  step() {
    return this.nextInstruction.eval(this);
  }

  get receiver() {
    throw new Error('subclass responsibility');
  }

  get topLevelActivation() {
    throw new Error('subclass responsibility');
  }

  get methodActivation() {
    throw new Error('subclass responsibility');
  }

  declVar(sourceLoc, name, value) {
    if (this.varDeclActivations[name] === this) {
      throw new Error('duplicate declaration for ' + name);
    }
    this.varDeclActivations[name] = this;
    this.varValues[name] = value;
    if (sourceLoc) {
      this.R.declVar(sourceLoc, this.env, name, value);
    }
  }

  setVar(name, value) {
    const declActivation = this.varDeclActivations[name];
    if (!declActivation) {
      throw new Error('undeclared variable ' + name);
    } else {
      declActivation.varValues[name] = value;
    }
  }

  classOf(value) {
    if (value instanceof BlockClosure) {
      return this.topLevelActivation.varValues.Block;
    } else if (value instanceof Class) {
      return this.topLevelActivation.varValues.Class;
    } else if (value instanceof Obj) {
      return value.class;
    } else if (typeof value === 'number') {
      return this.topLevelActivation.varValues.Number;
    } else if (typeof value === 'string') {
      return this.topLevelActivation.varValues.String;
    } else if (value === null) {
      return this.topLevelActivation.varValues.Null;
    } else if (value === true) {
      return this.topLevelActivation.varValues.True;
    } else if (value === false) {
      return this.topLevelActivation.varValues.False;
    } else {
      console.error(value);
      throw new Error('not sure what is the class of this object');
    }
  }

  getVar(name) {
    const declActivation = this.varDeclActivations[name];
    if (!declActivation) {
      throw new Error('undeclared variable ' + name);
    } else {
      return declActivation.varValues[name];
    }
  }

  IPrim(primFn, sourceLoc, nextInstruction) {
    primFn.call(this);
    this.nextInstruction = nextInstruction;
    return this;
  }

  IPush(value, nextInstruction) {
    this.stack.push(value);
    this.nextInstruction = nextInstruction;
    return this;
  }

  IPushThis(nextInstruction) {
    return this.IPush(this.receiver, nextInstruction);
  }

  IPushFromVar(name, nextInstruction) {
    this.stack.push(this.getVar(name));
    this.nextInstruction = nextInstruction;
    return this;
  }

  IPushFromInstVar(name, nextInstruction) {
    const value = this.receiver.getInstVar(name);
    this.stack.push(value);
    this.nextInstruction = nextInstruction;
    return this;
  }

  IPopIntoVar(name, sourceLoc, nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const value = this.stack.pop();
    this.setVar(name, value);
    if (sourceLoc) {
      this.R.assignVar(sourceLoc, this.env, this.varDeclActivations[name].env, name, value);
    }
    this.nextInstruction = nextInstruction;
    return this;
  }

  IPopIntoInstVar(name, sourceLoc, nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const value = this.stack.pop();
    this.receiver.setInstVar(name, value);
    if (sourceLoc) {
      this.R.assignInstVar(sourceLoc, this.env, this.receiver, name, value);
    }
    this.nextInstruction = nextInstruction;
    return this;
  }

  IDeclVar(name, sourceLoc, nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const value = this.stack.pop();
    this.declVar(sourceLoc, name, value);
    this.nextInstruction = nextInstruction;
    return this;
  }

  IDup(nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const value = this.stack[this.stack.length - 1];
    this.stack.push(value);
    console.debug('duplicated', value);
    this.nextInstruction = nextInstruction;
    return this;
  }

  IDrop(nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const value = this.stack.pop();
    console.debug('dropped', value);
    this.nextInstruction = nextInstruction;
    return this;
  }

  ICond(nextInstructionIfTrue, nextInstructionIfFalse) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const value = this.stack.pop();
    this.nextInstruction = value ? nextInstructionIfTrue : nextInstructionIfFalse;
    return this;
  }

  IBlock(sourceLoc, formals, code, nextInstruction) {
    this.stack.push(new BlockClosure(sourceLoc, formals, code, this));
    this.nextInstruction = nextInstruction;
    return this;
  }

  IDeclClass(name, instVarNames, nextInstruction) {
    throw new Error('class declarations are only allowed in the top-level activation');
  }

  IDeclMethod(sourceLoc, selector, className, formals, code, nextInstruction) {
    throw new Error('method declarations are only allowed in the top-level activation');
  }

  INew(nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const _class = this.stack.pop();
    if (!(_class instanceof Class)) {
      throw new Error('not a class');
    }
    const instance = _class.makeNewInstance();
    this.stack.push(instance);
    console.debug('made a new instance of', _class, instance);
    this.nextInstruction = nextInstruction;
    return this;
  }

  IArray(size, nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(size);
    const arr = this.getVar('Array').makeNewInstance();
    arr.setInstVar('size', size);
    for (let idx = size; idx >= 1; idx--) {
      const value = this.stack.pop();
      arr.instVars[idx] = value;
    }
    this.stack.push(arr);
    this.nextInstruction = nextInstruction;
    return this;
  }

  ISend(selector, numArgs, sourceLoc, activationPathToken, nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(numArgs + 1);

    const args = [];
    for (let idx = 0; idx < numArgs; idx++) {
      args.unshift(this.stack.pop());
    }
    const receiver = this.stack.pop();
    console.debug('send:', receiver, '.', selector, '(', ...args, ')', sourceLoc, activationPathToken);

    this.R.send(sourceLoc, this.env, receiver, selector, args, activationPathToken);

    if (receiver instanceof BlockClosure && selector === 'call') {
      this.nextInstruction = nextInstruction;
      return new BlockActivation(receiver, args, this);
    } else {
      const receiversClass = this.classOf(receiver);
      const method = receiversClass.getMethod(selector);
      this.nextInstruction = nextInstruction;
      return new MethodActivation(method, receiver, args, this.topLevelActivation, this);
    }
  }

  ISuperSend(selector, numArgs, sourceLoc, activationPathToken, nextInstruction) {
    const methodActivation = this.methodActivation;
    if (!methodActivation) {
      throw new Error('super-sends are only allowed inside a method');
    }
    this.assertStackContainsAtLeastThisManyElements(numArgs);
    const args = [];
    for (let idx = 0; idx < numArgs; idx++) {
      args.unshift(this.stack.pop());
    }
    console.debug('super send:', this.receiver, '.', selector, '(', ...args, ')', sourceLoc, activationPathToken);

    this.R.send(sourceLoc, this.env, receiver, selector, args, activationPathToken);

    const _class = methodActivation.method.class.superClass;
    const method = _class.getMethod(selector);
    this.nextInstruction = nextInstruction;
    return new MethodActivation(method, this.receiver, args, this.topLevelActivation, this);
  }

  ILocalReturn(sourceLoc) {
    throw new Error('can only return from a block activation');
  }

  INonLocalReturn(sourceLoc) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const value = this.stack.pop();
    console.debug('(non-local) returning', value, sourceLoc);
    const methodActivation = this.methodActivation;
    let activation = this;
    while (activation !== null) {
      if (activation === methodActivation) {
        const caller = methodActivation.caller;
        caller.stack.push(value);
        this.nextInstruction = null;
        if (sourceLoc) {
          this.R.nonLocalReturn(sourceLoc, this.env, value);
        }
        caller.R.receive(caller.env, value);
        return caller;
      }
      activation = activation.caller;
    }
    throw new Error('cannot return from a method activation that is no longer on the stack');
  }

  throw(e) {
    // * unwind stack until try _ on: E do: C
    //   w/ classOf(E) <: E is found
    // * call C(e)
    // * but what's the sourceLoc of the call? etc.
    debugger;
  }

  IDone() {
    throw new Error('`done` instruction is only valid in top-level activation');
  }

  assertStackContainsAtLeastThisManyElements(n) {
    if (this.stack.length < n) {
      throw new Error('stack should contain at least ' + n + ' elements');
    }
  }
}

class TopLevelActivation extends Activation {
  constructor(sourceLoc, code, R) {
    super([], [], null, null, sourceLoc, code);
    this.R = R;
    this.env = R.program(sourceLoc);
    this.installBuiltins();
  }

  hasSourceLoc() {
    return !!this.sourceLoc;
  }

  get receiver() {
    throw new Error('cannot use `this` in top-level activation');
  }

  get topLevelActivation() {
    return this;
  }

  get methodActivation() {
    return null;
  }

  IDeclClass(name, instVarNames, nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const superClass = this.stack.pop();
    const _class = new Class(name, superClass, instVarNames);
    if (!(_class instanceof Class)) {
      throw new Error('not a class!');
    }
    this.declVar(null, name, _class);
    this.nextInstruction = nextInstruction;
    return this;
  }

  IDeclMethod(sourceLoc, selector, className, formals, code, nextInstruction) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const _class = this.stack.pop();
    if (!(_class instanceof Class)) {
      throw new Error('not a class!');
    }
    _class.declMethod(sourceLoc, selector, className, formals, code);
    this.nextInstruction = nextInstruction;
    return this;
  }

  INonLocalReturn(sourceLoc) {
    throw new Error('cannot return from top-level activation');
  }

  IDone() {
    if (this.stack.length > 0) {
      throw new Error('expected stack to be empty');
    }
    return null;
  }
}

class MethodActivation extends Activation {
  constructor(method, receiver, args, parent, caller) {
    super(args, method.formals, parent, caller, method.sourceLoc, method.code);
    this.method = method;
    this._receiver = receiver;
    this.declareFormals();
  }

  declareFormals() {
    this.declVar(this.method.className.sourceLoc, 'this', this.receiver);
    super.declareFormals();
  }

  hasSourceLoc() {
    return !!this.method.sourceLoc;
  }

  get receiver() {
    return this._receiver;
  }

  get topLevelActivation() {
    return this.parent;
  }

  get methodActivation() {
    return this;
  }
}

class BlockActivation extends Activation {
  constructor(closure, args, caller) {
    super(args, closure.formals, closure.parent, caller, closure.sourceLoc, closure.code);
    this.blockClosure = closure;
    this.declareFormals();
  }

  hasSourceLoc() {
    return !!this.blockClosure.sourceLoc;
  }

  get receiver() {
    return this.methodActivation.receiver;
  }

  get topLevelActivation() {
    return this.methodActivation ?
      this.methodActivation.topLevelActivation :
      this.caller.topLevelActivation;
  }

  get methodActivation() {
    return this.parent.methodActivation;
  }

  ILocalReturn(sourceLoc) {
    this.assertStackContainsAtLeastThisManyElements(1);
    const value = this.stack.pop();
    console.debug('returning', value, sourceLoc);
    if (sourceLoc) {
      this.R.localReturn(sourceLoc, this.env, value);
    }
    this.caller.R.receive(this.caller.env, value);
    this.caller.stack.push(value);
    this.nextInstruction = null;
    return this.caller;
  }
}
