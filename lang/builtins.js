"use strict";

TopLevelActivation.prototype.installBuiltins = function() {
  const declClass = (name, superClass, instVarNames) => {
    const _class = new Class(name, superClass, instVarNames);
    this.declVar(null, name, _class);
    return _class;
  }

  const _Object = declClass('Object', null, []);

  const Block = declClass('Block', _Object, []);
  {
    let loop, callCond, callBody;
    Block.declMethod(null, 'while_do:', new Ident(null, 'Block'), [new Ident(null, 'body')],
      new IPush(0,
        new IDeclVar('activationPathToken', null,
          loop = new IPushThis(
            new IPrim(
              function() { callCond.operands[3] = this.varValues.activationPathToken++; },
              null,
              callCond = new ISend('call', 0, null, undefined,
                new ICond(
                  new IPushFromVar('body',
                    new IPrim(
                      function() { callBody.operands[3] = this.varValues.activationPathToken++; },
                      null,
                      callBody = new ISend('call', 0, null, undefined, null))),
                  new IPush(null, new INonLocalReturn(null)))))))));
    callBody.operands[4] = loop;
  }
};
