"use strict";

const preludeAST = (function() {

  const source = `

    def Object.init() {}
    def Object.getClass() {
      var ans = null;
      @{ this.varValues.ans = this.classOf(this.receiver); }@
      return ans;
    }
    def Object == that {
      var ans = null;
      @{ this.varValues.ans = this.receiver === this.varValues.that; }@
      return ans;
    }
    def Object != that {
      var ans = null;
      @{ this.varValues.ans = this.receiver !== this.varValues.that; }@
      return ans;
    }
    def Object.toIdString() {
      var ans = null;
      @{
        const thisObj = this.receiver;
        this.varValues.ans = thisObj instanceof Obj ?
            '#' + thisObj.id :
            '' + thisObj;
      }@
      return ans;
    }
    def Object.toString() {
      var ans = null;
      @{ this.varValues.ans = '' + this.receiver; }@
      return ans;
    }
    def Object.println() {
      @{ console.log('>>', this.receiver); }@
      return null;
    }

    class Class;
    def Class.getName() {
      var ans = null;
      @{ this.varValues.ans = this.receiver.name; }@
      return ans;
    }
    def Class.toString() = "class " + this.getName();

    class Null;
    def Null.toString() = "null";

    class Comparable;
    def Comparable < that {
      var ans = null;
      @{ this.varValues.ans = this.receiver < this.varValues.that; }@
      return ans;
    }
    def Comparable <= that {
      var ans = null;
      @{ this.varValues.ans = this.receiver <= this.varValues.that; }@
      return ans;
    }
    def Comparable > that {
      var ans = null;
      @{ this.varValues.ans = this.receiver > this.varValues.that; }@
      return ans;
    }
    def Comparable >= that {
      var ans = null;
      @{ this.varValues.ans = this.receiver >= this.varValues.that; }@
      return ans;
    }

    class String extends Comparable;
    def String + that {
      var ans = that.toString();
      @{ this.varValues.ans = this.receiver + this.varValues.ans; }@
      return ans;
    }

    class Number extends Comparable;
    def Number + that {
      var ans = null;
      @{ this.varValues.ans = this.receiver + this.varValues.that; }@
      return ans;
    }
    def Number - that {
      var ans = null;
      @{ this.varValues.ans = this.receiver - this.varValues.that; }@
      return ans;
    }
    def Number * that {
      var ans = null;
      @{ this.varValues.ans = this.receiver * this.varValues.that; }@
      return ans;
    }
    def Number / that {
      var ans = null;
      @{ this.varValues.ans = this.receiver / this.varValues.that; }@
      return ans;
    }
    def Number % that {
      var ans = null;
      @{ this.varValues.ans = this.receiver % this.varValues.that; }@
      return ans;
    }

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
