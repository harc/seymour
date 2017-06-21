"use strict";

class Method {
  constructor(sourceLoc, _class, selector, formals, code) {
    this.sourceLoc = sourceLoc;
    this.class = _class;
    this.selector = selector;
    this.formals = formals;
    this.code = code;
  }
}
