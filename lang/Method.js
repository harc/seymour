"use strict";

class Method {
  constructor(sourceLoc, _class, selector, className, formals, code) {
    this.sourceLoc = sourceLoc;
    this.class = _class;
    this.selector = selector;
    this.className = className;
    this.formals = formals;
    this.code = code;
  }
}
