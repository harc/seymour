"use strict";

class EventRecorder extends CheckedEmitter {
  constructor(newEventHandler) {
    super();
    this.registerEvent('addChild', 'child', 'parent');
    this.registerEvent('activateSend', 'send');
    this.registerEvent('addRoot', 'root');
    this.currentProgramOrSendEvent = null;
    this.lastEvent = null;
  }

  program(orderNum, sourceLoc) {
    const event = new ProgramEvent(orderNum, sourceLoc);
    this.currentProgramOrSendEvent = event;
    this.lastEvent = event;

    this.emit('addRoot', event);
    const env = this.mkEnv(sourceLoc, null);
    return env;
  }

  send(orderNum, sourceLoc, env, recv, selector, args, activationPathToken) {
    const event = new SendEvent(orderNum, sourceLoc, env, recv, selector, args, activationPathToken);
    env.currentSendEvent = event;
    this.currentProgramOrSendEvent = event;
    this.lastEvent = event;
    
    const parentEvent = env.programOrSendEvent;
    parentEvent.children.push(event);
    this.emit('addChild', event, parentEvent);
    // this event is only sent to event handler after it gets an activation environment (see below)
  }

  mkEnv(newEnvSourceLoc, parentEnv, scope = false) {
    const envClass = scope ? Scope : Env;
    const programOrSendEvent = this.currentProgramOrSendEvent;
    const callerEnv = programOrSendEvent.env;
    const newEnv = new envClass(newEnvSourceLoc, parentEnv, callerEnv, programOrSendEvent);
    this._registerSend(newEnv);
    return newEnv;
  }

  _registerSend(newEnv) {
    const programOrSendEvent = newEnv.programOrSendEvent;
    if ((programOrSendEvent instanceof SendEvent || programOrSendEvent instanceof ProgramEvent) &&
      !programOrSendEvent.activationEnv) {
      programOrSendEvent.activationEnv = newEnv;
      this.emit('activateSend', programOrSendEvent);
      if (programOrSendEvent.env) {
        const parentEvent = programOrSendEvent.env.programOrSendEvent;
        programOrSendEvent.env.receive(programOrSendEvent);
      }
    }
  }

  receive(env, returnValue) {
    if (env.currentSendEvent != null) {
      env.currentSendEvent.returnValue = returnValue;
    }
    this.currentProgramOrSendEvent = env.programOrSendEvent;
    return returnValue;
  }


  enterScope(orderNum, sourceLoc, env) {
    this.send(orderNum, sourceLoc, env, null, 'enterNewScope', []);
    return this.mkEnv(sourceLoc, env, true);
  }

  leaveScope(env) {
    this.receive(env, null);
  }


  _emit(event) {
    this.currentProgramOrSendEvent.children.push(event);
    event.env.receive(event);
    this.emit('addChild', event, this.currentProgramOrSendEvent);
  }

  show(orderNum, sourceLoc, env, string, alt) {
    if (typeof string !== 'string') {
      string = alt;
    }
    const event = new ShowEvent(orderNum, sourceLoc, env, string);
    this._emit(event);
  }

  error(sourceLoc, env, errorString) {
    const event = new ErrorEvent(sourceLoc, env, errorString);
    this._emit(event);
  } 

  localReturn(orderNum, sourceLoc, env, value) {
    const event = new LocalReturnEvent(orderNum, sourceLoc, env, value);
    this.lastEvent = event;
    this._emit(event);
    return value;
  }

  nonLocalReturn(orderNum, sourceLoc, env, value) {
    const event = new NonLocalReturnEvent(orderNum, sourceLoc, env, value);
    this.lastEvent = event;
    this._emit(event);
    return value;
  }

  declVar(orderNum, sourceLoc, env, declEnv, name, value) {
    const event = new VarDeclEvent(orderNum, sourceLoc, env, name, value);
    this.lastEvent = event;
    this._emit(event);
    return value;
  }

  assignVar(orderNum, sourceLoc, env, declEnv, name, value) {
    const event = new VarAssignmentEvent(orderNum, sourceLoc, env, declEnv, name, value);
    this.lastEvent = event;
    this._emit(event);
    return value;
  }

  assignInstVar(orderNum, sourceLoc, env, obj, name, value) {
    const event = new InstVarAssignmentEvent(orderNum, sourceLoc, env, obj, name, value);
    this._emit(event);
    return value;
  }

  instantiate(orderNum, sourceLoc, env, _class, args, newInstance) {
    const event = new InstantiationEvent(orderNum, sourceLoc, env, _class, args, newInstance);
    this._emit(event);
    return newInstance;
  }
}
