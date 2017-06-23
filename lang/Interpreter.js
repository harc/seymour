"use strict";

class Interpreter {
  constructor(sourceLoc, code, R) {
    this.R = R;
    this.global = new TopLevelActivation(sourceLoc, code, R);
    this.currentActivation = this.global;
  }

  step() {
    this.currentActivation = this.currentActivation.step();
    return this.currentActivation === null;
  }

  runForMillis(timeLimit) {
    const t0 = performance.now();
    while (true) {
      let done;
      // try {
        done = this.step();
      // } catch(e) {
      //   console.error('system error', e);
      //   return true;
      // }
      if (done) {
        return true;
      }
      if (performance.now() - t0 >= timeLimit) {
        return false;
      }
    }
  }
}
