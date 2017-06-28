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
    def Object.log() {
      @{ console.log('>>', this.receiver); }@
      return null;
    }
    def Object.println() = this.toString().log();
    def Object.show() {
      var str = this.toDebugString();
      var defaultStr = this.toIdString();
      @{ this.R.show(
          this.env.programOrSendEvent.sourceLoc, 
          this.env.programOrSendEvent.env, 
          this.getVar('str'),
          this.getVar('defaultStr')
        ); }@
      return this;
    }
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

    def Block.call() {
      // The implementation of this method is in Activation.ISend -- see activations.js
      @{ throw new Error('Block\\'s call method should never be called directly'); }@
    }

    class Class;
    def Class.name() {
      var ans = null;
      @{ this.setVar('ans', this.receiver.name); }@
      return ans;
    }
    def Class.toString() = "class " + this.name();
    def Class.toDebugString() = "class " + this.name();

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
    def String.size() {
      var ans = null;
      @{ this.setVar('ans', this.receiver.length); }@
      return ans;
    }
    def String.get(idx) {
      if (1 <= idx and: {idx <= this.size()}) then: {
        var ans = null;
        @{ this.setVar('ans', this.receiver[this.getVar('idx') - 1]); }@
        return ans;
      } else: {
        new IndexOutOfBounds(this, idx).throw();
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
    def Number.sqrt() {
      var ans = null;
      @{ this.setVar('ans', Math.sqrt(this.receiver)); }@
      return ans;
    }
    def Number.floor() {
      var ans = null;
      @{ this.setVar('ans', Math.floor(this.receiver)); }@
      return ans;
    }
    def Number.ceil() {
      var ans = null;
      @{ this.setVar('ans', Math.ceil(this.receiver)); }@
      return ans;
    }
    def Number.min(other) {
      var ans = null;
      @{ this.setVar('ans', Math.min(this.receiver, this.getVar('other'))); }@
      return ans;
    }
    def Number.max(other) {
      var ans = null;
      @{ this.setVar('ans', Math.max(this.receiver, this.getVar('other'))); }@
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

    class Array with size;
    def Array.init(size) {
      if (size.getClass() != Number or: {size < 0}) then: {
        new InvalidArgument(this, "init", "size", size).throw();
      };
      this.size = size;
    }
    def Array.size() = this.size;
    def Array.get(idx) {
      if (idx.getClass() != Number or: {idx < 1 or: {idx > this.size}}) then: {
        new IndexOutOfBounds(this, idx).throw();
      };
      var ans = null;
      @{
        let value = this.receiver.instVars[this.getVar('idx')];
        this.setVar('ans', value === undefined ? null : value);
      }@
      return ans;
    }
    def Array.set(idx, value) {
      if (idx.getClass() != Number or: {idx < 1 or: {idx > this.size}}) then: {
        new IndexOutOfBounds(this, idx).throw();
      };
      @{ 
        this.receiver.instVars[this.getVar('idx')] = this.getVar('value'); 
        this.R.assignInstVar(null, this.env, this.receiver, this.getVar('idx'), this.getVar('value'));
      }@
    }
    def forEach Array do: fn {
      for 1 to: this.size do: {idx |
        fn(this.get(idx), idx);
      };
    }
    def Array.map(fn) {
      var ans = new Array(this.size);
      forEach this do: {x, idx |
        var value = fn(x);
        ans.set(idx, value);
      };
      return ans;
    }
    def Array.filter(fn) {
      var predVals = new Array(this.size());
      var numItems = 0;
      forEach this do: {x, i|
        predVals.set(i, fn(x));
        if predVals.get(i) then: { numItems = numItems + 1; };
      };

      var ans = new Array(numItems);
      var idx = 1;
      forEach this do: {x, i|
        if predVals.get(i) then: {
          ans.set(idx, x);
          idx = idx + 1;
        };
      };
      return ans;
    }
    def Array.reduce(fn, z) {
      var acc = z;
      forEach this do: {x |
        acc = fn(acc, x);
      };
      return acc;
    }
    def Array.toString() {
      var first = true;
      var meat = "";
      forEach this do: {x |
        if first then: {
          first = false;
        } else: {
          meat = meat + ", ";
        };
        meat = meat + x.toString();
      };
      return "[" + meat + "]";
    }

    class Dictionary;
    def Dictionary.init(kvPairs) {
      forEach kvPairs do: {pair |
        var key = pair.get(1);
        var val = pair.get(2);
        @{ 
            this.receiver.instVars[this.getVar('key')] = this.getVar('val'); 
            this.R.assignInstVar(null, this.env, this.receiver, this.getVar('key'), this.getVar('val'));
          }@
      };
    }
    def Dictionary.has(key) {
      var ans = null;
      @{ this.setVar('ans', this.getVar('key') in this.receiver.instVars); }@
      return ans;
    }
    def Dictionary.get(key) {
      var ans = null;
      @{ this.setVar('ans', this.receiver.instVars[this.getVar('key')]); }@
      return ans;
    }
    def Dictionary.set(key, value) {
      var ans = this.get(key);
      @{ 
        this.receiver.instVars[this.getVar('key')] = this.getVar('value'); 
        this.R.assignInstVar(null, this.env, this.receiver, this.getVar('key'), this.getVar('value'));
      }@
      return ans;
    }

    def Number to: end {
      var size = end - this + 1;
      var arr = new Array(size);
      for 1 to: size do: {idx |
        var num = this + idx - 1;
        arr.set(idx, num);
      };
      return arr;
    }

    // Exceptions

    def Object.throw() {
      @{ this.throw(this.receiver); }@
    }

    def try Block on: exceptionClass do: catchBlock {
      "TODO".throw();
    }

    def try Block catch: catchBlock {
      return try this on: Object do: catchBlock;
    }

    class Exception;
    def Exception.toString() {
      return "[" + this.getClass().name() + " exception]";
    }

    class IndexOutOfBounds extends Exception with collection, index;
    def IndexOutOfBounds.init(collection, index) {
      this.collection = collection;
      this.index = index;
    }

    class InvalidArgument extends Exception with receiver, methodName, argName, argValue;
    def InvalidArgument.init(receiver, methodName, argName, argValue) {
      this.receiver = receiver;
      this.methodName = methodName;
      this.argName = argName;
      this.argValue = argValue;
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