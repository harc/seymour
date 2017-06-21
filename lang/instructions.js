"use strict";

class Instruction {
  constructor(...operands) {
    this.operands = operands;
  }

  eval(activation) {
    console.debug('instruction:', this.constructor.name, ...this.operands);
    return activation[this.constructor.name].apply(activation, this.operands);
  }
}

class IPrim extends Instruction {
  constructor(primFn, sourceLoc, nextInstruction) {
    super(primFn, sourceLoc, nextInstruction);
  }
}

class IPush extends Instruction {
  constructor(value, nextInstruction) {
    super(value, nextInstruction);
  }
}

class IPushThis extends Instruction {
  constructor(nextInstruction) {
    super(nextInstruction);
  }
}

class IPushFromVar extends Instruction {
  constructor(name, nextInstruction) {
    super(name, nextInstruction);
  }
}

class IPushFromInstVar extends Instruction {
  constructor(name, nextInstruction) {
    super(name, nextInstruction);
  }
}

class IPopIntoVar extends Instruction {
  constructor(name, sourceLoc, nextInstruction) {
    super(name, sourceLoc, nextInstruction);
  }
}

class IPopIntoInstVar extends Instruction {
  constructor(name, sourceLoc, nextInstruction) {
    super(name, sourceLoc, nextInstruction);
  }
}

class IDeclVar extends Instruction {
  constructor(name, sourceLoc, nextInstruction) {
    super(name, sourceLoc, nextInstruction);
  }
}

class IDup extends Instruction {
  constructor(nextInstruction) {
    super(nextInstruction);
  }
}

class IDrop extends Instruction {
  constructor(nextInstruction) {
    super(nextInstruction);
  }
}

class ICond extends Instruction {
  constructor(nextInstructionIfTrue, nextInstructionIfFalse) {
    super(nextInstructionIfTrue, nextInstructionIfFalse);
  }
}

class IBlock extends Instruction {
  constructor(sourceLoc, formals, code, nextInstruction) {
    super(sourceLoc, formals, code, nextInstruction);
  }
}

class IDeclClass extends Instruction {
  constructor(name, instVarNames, nextInstruction) {
    super(name, instVarNames, nextInstruction);
  }
}

class IDeclMethod extends Instruction {
  constructor(sourceLoc, selector, className, formals, code, nextInstruction) {
    super(sourceLoc, selector, className, formals, code, nextInstruction);
  }
}

class INew extends Instruction {
  constructor(nextInstruction) {
    super(nextInstruction);
  }
}

class IArray extends Instruction {
  constructor(size, nextInstruction) {
    super(size, nextInstruction);
  }
}

class ISend extends Instruction {
  constructor(selector, numArgs, sourceLoc, activationPathToken, nextInstruction) {
    super(selector, numArgs, sourceLoc, activationPathToken, nextInstruction);
  }
}

class ISuperSend extends Instruction {
  constructor(selector, numArgs, sourceLoc, activationPathToken, nextInstruction) {
    super(selector, numArgs, sourceLoc, activationPathToken, nextInstruction);
  }
}

class INonLocalReturn extends Instruction {
  constructor(sourceLoc) {
    super(sourceLoc);
  }
}

class ILocalReturn extends Instruction {
  constructor(sourceLoc) {
    super(sourceLoc);
  }
}

class IDone extends Instruction {
  constructor() {
    super();
  }
}
