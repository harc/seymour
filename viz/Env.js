"use strict";

class Env {
  constructor(sourceLoc, parentEnv, callerEnv, programOrSendEvent) {
    this.id = Env.nextEnvId++;
    this.sourceLoc = sourceLoc;
    this.parentEnv = parentEnv;
    this.callerEnv = callerEnv;
    this.programOrSendEvent = programOrSendEvent;
    this.currentSendEvent = null;
    this.microVizEvents = new MicroVizEvents(programOrSendEvent, true, sourceLoc);
    this.programOrSendEventToMicroVizEvents = new Map([[programOrSendEvent, this.microVizEvents]]);
  }

  receive(event) {
    let env = this;
    let visitedDeclEnv = false;
    while (env) {
      env.maybeAdd(event);
      if (event instanceof VarAssignmentEvent &&
          env === event.declEnv) {
        visitedDeclEnv = true;
        event.visitedDeclEnv = true;
      }
      env = env.callerEnv;
    }
  }

  maybeAdd(event) {
    const programOrSendEvent = this.targetProgramOrSendEventFor(event);
    if (!programOrSendEvent) {
      return;
    }
    const microVizEvents = this.programOrSendEventToMicroVizEvents.get(programOrSendEvent);
    if (event instanceof SendEvent && event.sourceLoc !== null) {
      const newMicroVizEvents = new MicroVizEvents(event, false, event.sourceLoc);
      this.programOrSendEventToMicroVizEvents.set(event, newMicroVizEvents);
      microVizEvents.add(newMicroVizEvents);
    } else if (!(event instanceof SendEvent)) {
      microVizEvents.add(event);
    }
  }

  targetProgramOrSendEventFor(event) {
    if (event.env === this) {
      return this.programOrSendEvent;
    }

    let env = event.env;
    while (env !== this) {
      const sendEvent = env.programOrSendEvent;
      if (this.programOrSendEventToMicroVizEvents.has(sendEvent)) {
        if (this.shouldOnlyShowWhenLocal(event) && event.sourceLoc !== null) {
          if (event.env instanceof Scope && sendEvent.sourceLoc.contains(event.env.sourceLoc)) {
            return sendEvent;
          } else if (sendEvent.sourceLoc.strictlyContains(event.env.sourceLoc)) {
            return sendEvent;
          } else {
            return null;
          }
        } else {
          return sendEvent;
        }
      } else {
        env = env.callerEnv;
      }
    }
    return null;
  }

  shouldOnlyShowWhenLocal(event) {
    return event instanceof SendEvent ||
        event instanceof ReturnEvent ||
        event instanceof VarDeclEvent ||
        event instanceof ShowEvent ||
        event instanceof VarAssignmentEvent && event.visitedDeclEnv;
  }

  shouldBubbleUp(event) {
    if (event instanceof VarAssignmentEvent) {
      return this !== event.declEnv;
    } else {
      return true;
    }
  }
}

Env.nextEnvId = 0;

class Scope extends Env {
  constructor(sourceLoc, parentEnv, callerEnv, programOrSendEvent) {
    super(sourceLoc, parentEnv, callerEnv, programOrSendEvent);
  }
}