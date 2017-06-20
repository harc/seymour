"use strict";

class Interpreter {
  constructor(code) {
    this.global = new TopLevelActivation(code);
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
      try {
        done = this.step();
      } catch(e) {
        if (e instanceof Eggception) {
          console.error('uncaught exception', e.value);
        } else {
          console.error('system error', e);
        }
        return true;
      }
      if (done) {
        return true;
      }
      if (performance.now() - t0 >= timeLimit) {
        return false;
      }
    }
  }
}
