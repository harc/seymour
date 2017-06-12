"use strict";

TopLevelActivation.prototype.installBuiltins = function() {
  const declClass = (name, superClass, instVarNames) => {
    const _class = new Class(name, superClass, instVarNames);
    this.declVar(name, _class);
    return _class;
  }

  const _Object = declClass('Object', null, []);
  _Object.declMethod('init', [],
    new IPush(null,
      new INonLocalReturn(null)));
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

  const _Class = declClass('Class', _Object, []);

  const Null = declClass('Null', _Object, []);

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
  _Number.declMethod('for_to:do:', ['end', 'body'],
    new IPushThis(
      new IDeclVar('idx', null,
        new IBlock([],
          new IPushFromVar('idx',
            new IPushFromVar('end',
              new ISend('<=', 1, null, '<=',
                new ILocalReturn(null)))),
          new IBlock([],
            new IPushFromVar('body',
              new IPushFromVar('idx',
                new ISend('call', 1, null, 'call',
                  new IPushFromVar('idx',
                    new IPush(1,
                      new ISend('+', 1, null, '+',
                        new IPopIntoVar('idx', null,
                          new IPush(null,
                            new ILocalReturn(null))))))))),
            new ISend('while_do:', 1, null, 'while_do:',
              new INonLocalReturn(null)))))));

  const _Boolean = declClass('Boolean', _Object, []);

  const True = declClass('True', _Boolean, []);
  True.declMethod('if_then:', ['tb'],
    new IPushFromVar('tb',
      new ISend('call', 0, null, 'call',
        new INonLocalReturn(null))));
  True.declMethod('if_then:else:', ['tb', 'fb'],
    new IPushFromVar('tb',
      new ISend('call', 0, null, 'call',
        new INonLocalReturn(null))));

  const False = declClass('False', _Boolean, []);
  False.declMethod('if_then:', ['tb'],
    new IPush(null,
      new INonLocalReturn(null)));
  False.declMethod('if_then:else:', ['tb', 'fb'],
    new IPushFromVar('fb',
      new ISend('call', 0, null, 'call',
        new INonLocalReturn(null))));

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
