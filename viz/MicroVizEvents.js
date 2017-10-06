"use strict";

class MicroVizEvents extends CheckedEmitter {
  constructor(programOrSendEvent, isImplementation, sourceLoc) {
    super();
    this.registerEvent('addEventGroup', 'eventGroup');

    this.programOrSendEvent = programOrSendEvent;
    this.isImplementation = isImplementation;
    this.sourceLoc = sourceLoc;
    this.eventGroups = [];

    if (this.isImplementation) {
      const eventGroup = new LocalEventGroup();
      this.eventGroups.push(eventGroup);
      this.emit('addEventGroup', eventGroup);
    }
  }

  get orderNum() {
    return this.programOrSendEvent.orderNum;
  }

  get lastEventGroup() {
    return this.eventGroups[this.eventGroups.length - 1];
  }

  add(event) {
    if (!this.sourceLoc) {
      return;
    }

    // TODO: make sure that `contains` is the right thing -- it used to be strictlyContains,
    // but that was causing problems for programs that were a single variable declaration, e.g.,
    // `var x = 2;`
    const eventIsLocal = event.sourceLoc && this.sourceLoc.contains(event.sourceLoc);
    if (eventIsLocal && this.lastEventGroup instanceof LocalEventGroup) {
      const lastEvent = this.lastEventGroup.lastEvent;
      if (!lastEvent ||
          event.orderNum > lastEvent.orderNum ||
          event.orderNum === lastEvent.orderNum && 
          (!(lastEvent instanceof VarDeclEvent && event instanceof VarAssignmentEvent) &&
          lastEvent.constructor.name !== event.constructor.name)) {
        // event.sourceLoc.startPos >= lastEvent.sourceLoc.endPos ||  // Toby's rule
        //   event.sourceLoc.strictlyContains(lastEvent.sourceLoc) ||  // Inside-out rule
          // event.sourceLoc.equals(lastEvent.sourceLoc) &&
          //     event.constructor !== lastEvent.constructor &&
          //     (event instanceof ReturnEvent || event instanceof ShowEvent)) {
        // no-op
      } else {
        const eventGroup = new LocalEventGroup();
        this.emit('addEventGroup', eventGroup);
        this.eventGroups.push(eventGroup);
      }
    } else if (eventIsLocal && !(this.lastEventGroup instanceof LocalEventGroup)) {
      const eventGroup = new LocalEventGroup();
      this.emit('addEventGroup', eventGroup);
      this.eventGroups.push(eventGroup);
    } else if (!eventIsLocal && !(this.lastEventGroup instanceof RemoteEventGroup)) {
      const eventGroup = new RemoteEventGroup();
      this.emit('addEventGroup', eventGroup);
      this.eventGroups.push(eventGroup);
    }
    this.lastEventGroup.add(event);
  }
}

class AbstractEventGroup extends CheckedEmitter {
  constructor(events) {
    super();
    this.registerEvent('addEvent', 'event');

    this.events = events;
  }

  add(event) {
    throw new Error('abstract method!');
  }

  get lastEvent() {
    return this.events[this.events.length - 1];
  }
}

class LocalEventGroup extends AbstractEventGroup {
  constructor(...events) {
    super(events);
  }

  add(event) {
    this.emit('addEvent', event);
    this.events.push(event);
  }
}

class RemoteEventGroup extends AbstractEventGroup {
  constructor(...events) {
    super(events);
    this.registerEvent('removeEvent', 'event');
  }

  add(event) {
    for (let idx = 0; idx < this.events.length; idx++) {
      if (event.subsumes(this.events[idx])) {
        this.emit('removeEvent', this.events[idx]);
        this.events.splice(idx, 1);
        break;
      }
    }

    this.emit('addEvent', event);
    this.events.push(event);
  }
}
