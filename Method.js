"use strict";

class Method {
  constructor(_class, selector, formals, code) {
    this.class = _class;
    this.selector = selector;
    this.formals = formals;
    this.code = code;
  }
}
