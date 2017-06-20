"use strict";

class EventRecorder extends CheckedEmitter {
  constructor(newEventHandler) {
    super();
    this.registerEvent('addChild', 'child', 'parent');
    this.registerEvent('addRoot', 'root');

    this.eventStack = [];  // ProgramEvent SendEvent*
  }

  get topOfEventStack() {
    return this.eventStack[this.eventStack.length - 1];
  }

  program(sourceLoc) {
    const event = new ProgramEvent(sourceLoc);
    this.eventStack.push(event);
    const env = this.mkEnv(sourceLoc);
    return env;
  }

  send(sourceLoc, env, recv, selector, args) {
    const event = new SendEvent(sourceLoc, env, recv, selector, args);
    this.eventStack.push(event);
    // this event is only sent to event handler after it gets an activation environment (see below)
  }

  mkEnv(newEnvSourceLoc) {
    const programOrSendEvent = this.eventStack[this.eventStack.length - 1];
    const callerEnv = programOrSendEvent.env;
    const newEnv = new Env(newEnvSourceLoc, callerEnv, programOrSendEvent);
    if ((programOrSendEvent instanceof SendEvent || programOrSendEvent instanceof ProgramEvent) &&
        !programOrSendEvent.activationEnv) {
      programOrSendEvent.activationEnv = newEnv;
      const parentEvent = this.eventStack[this.eventStack.length - 2];
      if (parentEvent) {
        parentEvent.children.push(programOrSendEvent);
        this.emit('addChild', programOrSendEvent, parentEvent);
        programOrSendEvent.env.receive(programOrSendEvent);
      } else {
        this.emit('addRoot', programOrSendEvent);
      }
    }
    return newEnv;
  }

  receive(returnValue) {
    this.topOfEventStack.returnValue = returnValue;
    this.eventStack.pop();
    return returnValue;
  }

  enterScope(sourceLoc, env) {
    this.send(sourceLoc, env, null, 'enterNewScope', []);
    return this.mkEnv(sourceLoc);
  }

  leaveScope() {
    this.receive(null);
  }

  _emit(event) {
    this.topOfEventStack.children.push(event);
    this.emit('addChild', event, this.topOfEventStack);
    event.env.receive(event);
  }

  return(sourceLoc, env, value) {
    const event = new ReturnEvent(sourceLoc, env, value);
    this._emit(event);
    return value;
  }

  declVar(sourceLoc, env, name, value) {
    const event = new VarDeclEvent(sourceLoc, env, name, value);
    this._emit(event);
    return value;
  }

  assignVar(sourceLoc, env, declEnv, name, value) {
    const event = new VarAssignmentEvent(sourceLoc, env, declEnv, name, value);
    this._emit(event);
    return value;
  }

  assignInstVar(sourceLoc, env, obj, name, value) {
    const event = new InstVarAssignmentEvent(sourceLoc, env, obj, name, value);
    this._emit(event);
    return value;
  }

  instantiate(sourceLoc, env, _class, args, newInstance) {
    const event = new InstantiationEvent(sourceLoc, env, _class, args, newInstance);
    this._emit(event);
    return newInstance;
  }
}
