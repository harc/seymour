"use strict";

class BlockClosure extends Obj {
  constructor(sourceLoc, formals, code, parent) {
    super(null);
    this.sourceLoc = sourceLoc;
    this.formals = formals;
    this.code = code;
    this.parent = parent;
  }
}
