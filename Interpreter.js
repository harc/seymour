"use strict";

class Interpreter {
  constructor(code) {
    this.global = new TopLevelActivation(code);
    this.currentActivation = this.global;
  }

  step() {
    this.currentActivation = this.currentActivation.step();
    return this.currentActivation !== null;
  }

  runForMillis(timeLimit) {
    const t0 = performance.now();
    while (true) {
      if (!this.step()) {
        return true;
      }
      if (performance.now() - t0 >= timeLimit) {
        return false;
      }
    }
  }
}
