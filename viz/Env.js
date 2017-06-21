"use strict";

class Env {
  constructor(sourceLoc, callerEnv, programOrSendEvent) {
    this.id = Env.nextEnvId++;
    this.sourceLoc = sourceLoc;
    this.callerEnv = callerEnv;
    this.programOrSendEvent = programOrSendEvent;
    this.currentSendEvent = null;
    this.microVizEvents = new MicroVizEvents(programOrSendEvent, sourceLoc);
    this.programOrSendEventToMicroVizEvents = new Map([[programOrSendEvent, this.microVizEvents]]);
  }

  receive(event) {
    this.maybeAdd(event);
    if (this.callerEnv && this.shouldBubbleUp(event)) {
      this.callerEnv.receive(event);
    }
  }

  maybeAdd(event) {
    const programOrSendEvent = this.targetProgramOrSendEventFor(event);
    if (!programOrSendEvent) {
      return;
    }
    const microVizEvents = this.programOrSendEventToMicroVizEvents.get(programOrSendEvent);
    if (event instanceof SendEvent) {
      const newMicroVizEvents = new MicroVizEvents(event, event.sourceLoc);
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
