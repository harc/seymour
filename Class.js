"use strict";

class Class {
  constructor(name, superClass = null, instVarNames = new Set()) {
    this.name = name;
    this.superClass = superClass;
    if (superClass === null) {
      this.instVarNames = new Set();
      this.methods = Object.create(null);
    } else {
      this.instVarNames = new Set(superClass.instVarNames);
      this.methods = Object.create(superClass.methods);
    }
    instVarNames.forEach(name => {
      if (this.instVarNames.has(name)) {
        throw new Error('duplicate instance variable ' + name + ' in class ' + this.name);
      }
      this.instVarNames.add(name);
    });
  }

  makeNewInstance() {
    return new Obj(this);
  }

  declMethod(selector, formals, code) {
    if (Object.prototype.hasOwnProperty.call(this.methods, selector)) {
      throw new Error('duplicate declaration of method ' + selector + ' in class ' + this.name);
    }
    this.methods[selector] = new Method(this, selector, formals, code);
  }

  getMethod(selector) {
    const m = this.methods[selector];
    if (m === undefined) {
      throw new Error('class ' + this.name + ' does not understand ' + selector);
    }
    return m;
  }
}
