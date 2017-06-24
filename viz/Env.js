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
      if (env.sourceLoc && event.sourceLoc &&
          ((!(event instanceof VarAssignmentEvent) && env.sourceLoc.contains(event.sourceLoc)) ||
           event instanceof VarAssignmentEvent && !visitedDeclEnv)) {
        env.maybeAdd(event);
      }
      if (event instanceof VarAssignmentEvent &&
          env === event.declEnv) {
        visitedDeclEnv = true;
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
    if (event instanceof SendEvent) {
      const newMicroVizEvents = new MicroVizEvents(event, false, event.sourceLoc);
      this.programOrSendEventToMicroVizEvents.set(event, newMicroVizEvents);
      microVizEvents.add(newMicroVizEvents);
    } else {
      microVizEvents.add(event);
    }
  }

  targetProgramOrSendEventFor(event) {
    if (!event.sourceLoc) {
      return null;
    }

    if (event.env === this) {
      return this.programOrSendEvent;
    }

    let env = event.env;
    while (env !== this) {
      const sendEvent = env.programOrSendEvent;
      if (this.programOrSendEventToMicroVizEvents.has(sendEvent)) {
        if (this.shouldOnlyShowWhenLocal(event)) {
          return sendEvent.sourceLoc.strictlyContains(event.env.sourceLoc) ? sendEvent : null;
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
        event instanceof VarDeclEvent;
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
