"use strict";

class Obj {
  constructor(_class) {
    this.id = Obj.nextId++;
    this.class = _class;
    this.instVars = Object.create(null);
    if (this.class) {
      this.class.instVarNames.forEach(name => this.instVars[name] = null);
    }
  }

  lookup(selector) {
    return this.class.getMethod(selector);
  }

  setInstVar(name, value) {
    this.assertIsInstVarName(name);
    this.instVars[name] = value;
  }

  getInstVar(name) {
    this.assertIsInstVarName(name);
    return this.instVars[name];
  }

  assertIsInstVarName(name) {
    if (!Object.prototype.hasOwnProperty.call(this.instVars, name)) {
      throw new Error(name + ' is not an instance variable');
    }
  }

  toString() {
    return this.class.name + '@' + this.id;
  }
}

Obj.nextId = 0;
