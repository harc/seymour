"use strict";

const preludeAST = (function() {

  const source = `
    def Object.init() {}

    class Class;

    class Null;

    class Boolean;
    
    class True extends Boolean;
    def if True then: tb = tb.call();
    def if True then: tb else: fb = tb.call();
    
    class False extends Boolean;
    def if False then: tb = null;
    def if False then: tb else: fb = fb.call();
    
    def for Number to: end do: body = for this to: end by: 1 do: body;
    def for Number to: end by: step do: body {
      var idx = this;
      while {idx <= end} do: {
        body(idx);
        idx = idx + 1;
      };
      return null;
    }
  `;

  try {
    const matchResult = seymourGrammar.match(source);
    return parse(matchResult, false);
  } catch (e) {
    console.error('Parse error in prelude -- details below');
    console.error(e);
    throw e;
  }
})();
