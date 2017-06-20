"use strict";

class BlockClosure extends Obj {
  constructor(formals, code, parent) {
    super(null);
    this.formals = formals;
    this.code = code;
    this.parent = parent;
  }
}
