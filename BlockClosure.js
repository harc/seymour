"use strict";

class BlockClosure {
  constructor(formals, code, parent) {
    this.formals = formals;
    this.code = code;
    this.parent = parent;
  }
}
