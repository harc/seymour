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
      new INonLocalReturn()));
  _Object.declMethod('==', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver === this.getVar('that')); },
      new INonLocalReturn()));
  _Object.declMethod('!=', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver !== this.getVar('that')); },
      new INonLocalReturn()));
  _Object.declMethod('toString', [],
    new IPrim(
      function() { this.stack.push('' + this.receiver); },
      new INonLocalReturn()));
  _Object.declMethod('println', [],
    new IPrim(
      function() { console.log('>>', this.receiver); },
      new IPushThis(
        new INonLocalReturn())));

  const _Class = declClass('Class', _Object, []);

  const Null = declClass('Null', _Object, []);

  const Comparable = declClass('Comparable', _Object, []);
  Comparable.declMethod('<=', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver <= this.getVar('that')); },
      new INonLocalReturn()));

  const _String = declClass('String', Comparable, []);
  _String.declMethod('+', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver + this.getVar('that')); },
      new INonLocalReturn()));

  const _Number = declClass('Number', Comparable, []);
  _Number.declMethod('+', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver + this.getVar('that')); },
      new INonLocalReturn()));
  _Number.declMethod('-', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver - this.getVar('that')); },
      new INonLocalReturn()));
  _Number.declMethod('*', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver * this.getVar('that')); },
      new INonLocalReturn()));
  _Number.declMethod('/', ['that'],
    new IPrim(
      function() { this.stack.push(this.receiver / this.getVar('that')); },
      new INonLocalReturn()));
  _Number.declMethod('for_to_do', ['end', 'body'],
    new IPushThis(
      new IDeclVar('idx',
        new IBlock([],
          new IPushFromVar('idx',
            new IPushFromVar('end',
              new ISend('<=', 1,
                new ILocalReturn()))),
          new IBlock([],
            new IPushFromVar('body',
              new IPushFromVar('idx',
                new ISend('call', 1,
                  new IPushFromVar('idx',
                    new IPush(1,
                      new ISend('+', 1,
                        new IPopIntoVar('idx',
                          new IPush(null,
                            new ILocalReturn())))))))),
            new ISend('while_do', 1,
              new INonLocalReturn()))))));

  const _Boolean = declClass('Boolean', _Object, []);

  const True = declClass('True', _Boolean, []);
  True.declMethod('if_then', ['tb'],
    new IPushFromVar('tb',
      new ISend('call', 0,
        new INonLocalReturn())));
  True.declMethod('if_then_else', ['tb', 'fb'],
    new IPushFromVar('tb',
      new ISend('call', 0,
        new INonLocalReturn())));

  const False = declClass('False', _Boolean, []);
  False.declMethod('if_then', ['tb'],
    new IPush(null,
      new INonLocalReturn()));
  False.declMethod('if_then_else', ['tb', 'fb'],
    new IPushFromVar('fb',
      new ISend('call', 0,
        new INonLocalReturn())));

  const Block = declClass('Block', _Object, []);
  {
    const callBody = new ISend('call', 0, null);
    const loop =
      new IPushThis(
        new ISend('call', 0,
          new ICond(
            new IPushFromVar('body', callBody),
            new IPush(null, new INonLocalReturn()))));
    callBody.operands[2] = loop;
    Block.declMethod('while_do', ['body'], loop);
  }
};
