"use strict";

const preludeAST = (function() {

  const source = `

    def Object.init() {}
    def Object.getClass() {
      var ans = null;
      @{ this.setVar('ans', this.classOf(this.receiver)); }@
      return ans;
    }
    def Object == that {
      var ans = null;
      @{ this.setVar('ans', this.receiver === this.getVar('that')); }@
      return ans;
    }
    def Object != that {
      var ans = null;
      @{ this.setVar('ans', this.receiver !== this.getVar('that')); }@
      return ans;
    }
    def Object.println() {
      @{ console.log('>>', this.receiver); }@
      return null;
    }
    def Object.printsln() = this.toString().println();
    def Object.toIdString() {
      var ans = null;
      @{
        const thisObj = this.receiver;
        this.setVar('ans', thisObj instanceof Obj ? '#' + thisObj.id : '' + thisObj);
      }@
      return ans;
    }
    def Object.toString() = this.toIdString();
    def Object.toDebugString() = this.toIdString();

    class Class;
    def Class.getName() {
      var ans = null;
      @{ this.setVar('ans', this.receiver.name); }@
      return ans;
    }
    def Class.toString() = "class " + this.getName();

    class Null;
    def Null.toString() = "null";

    class Comparable;
    def Comparable < that {
      var ans = null;
      @{ this.setVar('ans', this.receiver < this.getVar('that')); }@
      return ans;
    }
    def Comparable <= that {
      var ans = null;
      @{ this.setVar('ans', this.receiver <= this.getVar('that')); }@
      return ans;
    }
    def Comparable > that {
      var ans = null;
      @{ this.setVar('ans', this.receiver > this.getVar('that')); }@
      return ans;
    }
    def Comparable >= that {
      var ans = null;
      @{ this.setVar('ans', this.receiver >= this.getVar('that')); }@
      return ans;
    }

    class String extends Comparable;
    def String.getSize() {
      var ans = null;
      @{ this.setVar('ans', this.receiver.length); }@
      return ans;
    }
    def String.get(idx) {
      if (1 <= idx and: {idx <= this.getSize()}) then: {
        var ans = null;
        @{ this.setVar('ans', this.receiver[this.getVar('idx') - 1]); }@
        return ans;
      } else: {
        // TODO: throw an exception
        return null;
      };
    }
    def String + that {
      var ans = that.toString();
      @{ this.setVar('ans', this.receiver + this.getVar('ans')); }@
      return ans;
    }
    def String.toString() = this;
    def String.toIdString() {
      var ans = null;
      @{ this.setVar('ans', JSON.stringify(this.receiver)); }@
      return ans;
    }

    class Number extends Comparable;
    def Number + that {
      var ans = null;
      @{ this.setVar('ans', this.receiver + this.getVar('that')); }@
      return ans;
    }
    def Number - that {
      var ans = null;
      @{ this.setVar('ans', this.receiver - this.getVar('that')); }@
      return ans;
    }
    def Number * that {
      var ans = null;
      @{ this.setVar('ans', this.receiver * this.getVar('that')); }@
      return ans;
    }
    def Number / that {
      var ans = null;
      @{ this.setVar('ans', this.receiver / this.getVar('that')); }@
      return ans;
    }
    def Number % that {
      var ans = null;
      @{ this.setVar('ans', this.receiver % this.getVar('that')); }@
      return ans;
    }

    class Boolean;
    
    class True extends Boolean;
    def True.not() = false;
    def True and: block = block();
    def True or: block = true;
    def if True then: tb = tb();
    def if True then: tb else: fb = tb();
    
    class False extends Boolean;
    def False.not() = true;
    def False and: block = false;
    def False or: block = block();
    def if False then: tb = null;
    def if False then: tb else: fb = fb();
    
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
