"use strict";

TopLevelActivation.prototype.installBuiltins = function() {
  const declClass = (name, superClass, instVarNames) => {
    const _class = new Class(name, superClass, instVarNames);
    this.declVar(name, _class);
    return _class;
  }

  const _Object = declClass('Object', null, []);
  _Object.declMethod('==', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver === this.getVar('that')); },
      new INonLocalReturn(null)));
  _Object.declMethod('!=', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver !== this.getVar('that')); },
      new INonLocalReturn(null)));
  _Object.declMethod('toString', [],
    new IPrim(
      function() { this.stack.push('' + this.receiver); },
      new INonLocalReturn(null)));
  _Object.declMethod('println', [],
    new IPrim(
      function() { console.log('>>', this.receiver); },
      new IPushThis(
        new INonLocalReturn(null))));

  const Comparable = declClass('Comparable', _Object, []);
  Comparable.declMethod('<=', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver <= this.getVar('that')); },
      new INonLocalReturn(null)));

  const _String = declClass('String', Comparable, []);
  _String.declMethod('+', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver + this.getVar('that')); },
      new INonLocalReturn(null)));

  const _Number = declClass('Number', Comparable, []);
  _Number.declMethod('+', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver + this.getVar('that')); },
      new INonLocalReturn(null)));
  _Number.declMethod('-', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver - this.getVar('that')); },
      new INonLocalReturn(null)));
  _Number.declMethod('*', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver * this.getVar('that')); },
      new INonLocalReturn(null)));
  _Number.declMethod('/', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver / this.getVar('that')); },
      new INonLocalReturn(null)));

  const Block = declClass('Block', _Object, []);
  {
    let loop, callCond, callBody;
    Block.declMethod('while_do:', ['body'],
      new IPush(0,
        new IDeclVar('activationPathToken', null,
          loop = new IPushThis(
            new IPrim(
              function() { callCond.operands[3] = this.varValues.activationPathToken++; },
              callCond = new ISend('call', 0, null, undefined,
                new ICond(
                  new IPushFromVar('body',
                    new IPrim(
                      function() { callBody.operands[3] = this.varValues.activationPathToken++; },
                      callBody = new ISend('call', 0, null, undefined, null))),
                  new IPush(null, new INonLocalReturn(null)))))))));
    callBody.operands[4] = loop;
  }
};
