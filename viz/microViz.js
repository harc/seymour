"use strict";

// toplevel class. persists across focuses. manages codemirror
class MicroViz extends CheckedEmitter {
  constructor(container, env = null) {
    super();
    this.registerEvent('click', 'event', 'eventView');
    this.registerEvent('mouseover', 'event', 'eventView');
    this.registerEvent('mouseout', 'event', 'eventView');

    this.microViz = this;

    this.container = container;
    this.editor = CodeMirror(container);
    this.widgetForLine = {};

    this.microVizParent = d('microVizDiv', {});
    this.background = d('microVizBackground', {});
    this.microVizHolder = d('microVizHolder', {},
        this.background,
        this.microVizParent);
    container.appendChild(this.microVizHolder);
    container.classList.add('microViz');

    if (env !== null) {
      this.setEnv(env);
    }
  }

  setEnv(env) {
    this.eventViews = new Map();

    Object.keys(this.widgetForLine)
      .forEach(line => this.widgetForLine[line].clear());
    this.microVizParent.innerHTML = '';

    this.clearBackground();
    this.setupBackground();

    if (env.callerEnv) {
      let globalEnv = env.callerEnv;
      while (globalEnv.callerEnv) {
        globalEnv = globalEnv.callerEnv;
      }
      this.microVizEvents = new MicroVizEvents(globalEnv.programOrSendEvent, globalEnv.sourceLoc);
      this.microVizEvents.eventGroups = [new LocalEventGroup(env.microVizEvents)];
    } else {
      this.microVizEvents = env.microVizEvents;
    }

    this.topLevelSend = new SendView(this, true, this.microVizEvents, this.microVizEvents.sourceLoc, '');
    this.microVizParent.appendChild(this.topLevelSend.DOM);

    this.tagLines(this.topLevelSend.startLine, this.topLevelSend.endLine);
    range(this.topLevelSend.startLine, this.topLevelSend.endLine)
      .forEach(line => this.fixHeight(line));
  }

  clearBackground() {
    while (this.background.children.length > 0) {
      this.background.removeChild(this.background.firstChild);
    }
  }

  setupBackground() {
    range(1, this.editor.getValue().split('\n').length)
        .forEach(line => {
          const lineDiv = d('line', {startLine: line, endLine: line});
          this.background.appendChild(lineDiv);
        });
  }

  tagLines(startLine, endLine) {
    const realEndLine = this.editor.getValue().split('\n').length;
    range(startLine, realEndLine)
      .forEach(lineNumber => {
        const cmLineNumber = lineNumber - 1;
        this.editor.removeLineClass(cmLineNumber, 'text');
      })
    range(startLine, endLine)
      .forEach(lineNumber => {
        const cmLineNumber = lineNumber - 1;
        this.editor.addLineClass(cmLineNumber, 'text', `line${lineNumber}`);
      });
  }

  fixHeight(lineNumber) {
    const $ = (el, query) => el.querySelector(query);
    const $$ = (el, query) => [].slice.call(el.querySelectorAll(query));

    const cmLineNumber = lineNumber - 1;

    const line = $(this.container, `.CodeMirror .line${lineNumber}.CodeMirror-line`);
    const itemsOnLine = $$(this.container, '*[endLine="' + lineNumber + '"]').concat(line);

    itemsOnLine.forEach(item => item.style.paddingBottom = '0px');
    if (this.widgetForLine.hasOwnProperty(cmLineNumber)) {
      this.widgetForLine[cmLineNumber].clear();
    }

    const bottom = itemsOnLine
        .map(element => element.getBoundingClientRect().bottom)
        .reduce((x, y) => Math.max(x, y), line.getBoundingClientRect().bottom);

    this.spaceLine(cmLineNumber, line, bottom);

    const bgline = $(this.container, 'line[startLine="' + lineNumber + '"]');
    this.inflate(bgline, bottom);

    const spacers = $$(this.container, 'spacer[endLine="' + lineNumber + '"]');
    spacers.forEach(spacer => this.inflate(spacer, bottom));

    const localEvents = $$(this.container, 'event[endLine="' + lineNumber + '"]:not(.remote)');
    localEvents.forEach(event => this.inflate(event, bottom));

    const remoteEventGroups = $$(this.container, 'remoteEventGroup[endLine="' + lineNumber + '"]');
    remoteEventGroups.forEach(remoteEventGroup => this.inflate(remoteEventGroup, bottom));
  }

  spaceLine(cmLineNumber, line, bottomY) {
    const paddingBottom = bottomY - line.getBoundingClientRect().bottom;
    this.widgetForLine[cmLineNumber] = this.editor.addLineWidget(
      cmLineNumber, this.spacer(paddingBottom)
    );
  }

  inflate(element, bottomY) {
    element.style.paddingBottom = bottomY - element.getBoundingClientRect().bottom;
  }

  spacer(height) {
    return d('div', {
      style: `height: ${height}px`
    });
  }

  fixHeightsFor(item) {
    range(item.startLine, item.endLine).forEach(line => this.fixHeight(line));
  }

  onClick(event) { this.emit('click', event, this.eventViews.get(event)); }
  onMouseover(event) { this.emit('mouseover', event, this.eventViews.get(event)); }
  onMouseout(event) { this.emit('mouseout', event, this.eventViews.get(event)); }

  addEventView(event, view) {
    this.eventViews.set(event, view);
  }
}


class AbstractView {
  constructor(parent, sourceLoc, classes) {
    this.parent = parent;
    this.microViz = parent.microViz;
    this.sourceLoc = sourceLoc;
    this.classes = classes;
    this.attributes = {
      startLine: this.sourceLoc.startLineNumber,
      endLine: this.sourceLoc.endLineNumber,
      class: this.classes
    };
  }

  get classList() {
    return this.DOM.classList;
  }

  render() {
    throw new Error(`render hasn't been implemented yet!`);
  }

  get startLine() { return this.attributes.startLine; }
  get endLine() { return this.attributes.endLine; }
}

class SendView extends AbstractView {
  constructor(parent, isImplementation, microVizEvents, sourceLoc=microVizEvents.sourceLoc, classes='') {
    super(parent, sourceLoc, classes);
    this.microVizEvents = microVizEvents;
    this.numGroups = 0;
    this.eventGroups = [];
    this.isImplementation = isImplementation;
    this.render();

    this.microVizEvents.addListener('addEventGroup', eventGroup =>
        this.addEventGroup(eventGroup));

    if (!this.isImplementation) {
      this.microViz.addEventView(this.microVizEvents.programOrSendEvent, this);
      this.DOM.onclick = (e) => {
        this.microViz.onClick(this.microVizEvents.programOrSendEvent);
        e.stopPropagation();
      };
      this.DOM.onmouseover = (e) => {
        this.microViz.onMouseover(this.microVizEvents.programOrSendEvent);
        e.stopPropagation();
      };
      this.DOM.onmouseout = (e) => {
        this.microViz.onMouseout(this.microVizEvents.programOrSendEvent);
        e.stopPropagation();
      };
    }
  }

  render() {
    this.DOM = d('send', this.attributes);
    if (!this.isImplementation) {
      this.addEmptySendGroup();
    }
    this.microVizEvents.eventGroups.forEach(group => this.addEventGroup(group));
  }

  addEmptySendGroup() {
    this.DOM.setAttribute('empty', true);
    this.DOM.appendChild(
      d('remoteEventGroup', {class: 'empty'}, d('emptySendDot', {}, '▪'))
    );
  }

  addEventGroup(eventGroup) {
    if (this.numGroups === 0 && !this.isImplementation) {
      this.DOM.removeChild(this.DOM.firstChild);
      this.DOM.removeAttribute('empty');
    }

    this.numGroups++;
    if (this.numGroups > 1) {
      this.DOM.setAttribute('loopy', true);
    }

    let eventGroupView;
    if (eventGroup instanceof LocalEventGroup) {
      eventGroupView = new LocalEventGroupView(this, eventGroup, this.sourceLoc);
    } else if (eventGroup instanceof RemoteEventGroup) {
      eventGroupView = new RemoteEventGroupView(this, eventGroup, this.sourceLoc);
    } else {
      throw new Error('groups must be local or remote');
    }

    this.DOM.appendChild(eventGroupView.DOM);
    this.eventGroups.push(eventGroupView);
  }
}

class LocalEventGroupView extends AbstractView {
  constructor(parent, localEventGroup, sourceLoc=localEventGroup.sourceLoc, classes='') {
    super(parent, sourceLoc, classes);
    this.localEventGroup = localEventGroup;
    this.lastPopulatedLineNumber = sourceLoc.startLineNumber - 1;
    this.lastEventNode = null;
    this.children = [];
    this.endSpacers = [];
    this.render();

    this.localEventGroup.addListener('addEvent', event => {
      this.addEvent(event);
    });
  }

  render() {
    this.DOM = d('localEventGroup', this.attributes);
    this.localEventGroup.events.forEach(event => this.addEvent(event));
  }

  addEvent(event) {
    this.clearEndSpacers(); // We can reuse the spacers
    if (event.sourceLoc.startLineNumber > this.lastPopulatedLineNumber) {
      this.addFirstInLine(event);
    } else if (event.sourceLoc.startLineNumber === this.lastChild.startLine) {
      this.addOverlappingAtTop(event);
    } else if (event.sourceLoc.startLineNumber > this.lastChild.startLine) {
      this.addOverlappingPushDown(event);
    } else if (event.sourceLoc.startLineNumber < this.lastChild.startLine) {
      this.addOverlappingInsideOut(event);
    } else {
      throw new Error('impossible!');
    }
    this.addEndSpacers();
    if (window.debug === true) debugger;
  }

  addFirstInLine(event) {
    range(this.lastPopulatedLineNumber + 1, event.sourceLoc.startLineNumber - 1)
          .forEach(lineNumber => this.addChild(new Spacer(this, lineNumber)));
    if (this.lastEventNode !== null) {
      this.lastEventNode.classList.add('lastInLine');
    }
    this.lastEventNode = this.mkEventView(event, event.sourceLoc, 'firstInLine');
    this.lastPopulatedLineNumber = event.sourceLoc.endLineNumber;
    this.addChild(this.lastEventNode);
  }

  addOverlappingAtTop(event) {
    this.lastEventNode = this.mkEventView(event, event.sourceLoc);
    this.lastPopulatedLineNumber =
        Math.max(this.lastPopulatedLineNumber, event.sourceLoc.endLineNumber);
    this.addChild(this.lastEventNode);
  }

  addOverlappingPushDown(event) {
    this.lastEventNode = this.mkEventView(event, event.sourceLoc, 'pushDown');
    this.lastPopulatedLineNumber =
        Math.max(this.lastPopulatedLineNumber, event.sourceLoc.endLineNumber);
    const spacers =
        range(this.lastChild.startLine, event.sourceLoc.startLineNumber - 1).
        map(lineNumber => new Spacer(this, lineNumber));
    if (spacers.length > 0) { spacers.push({DOM: d('br')}); }
    this.addChild(new Wrapper(this, 
        ...spacers, 
        this.lastEventNode));
  }

  addOverlappingInsideOut(event) {
    const nodesToWrap = [];
    while (event.sourceLoc.startLineNumber <= this.lastChild.startLine) {
      nodesToWrap.unshift(this.popChild());
    }
    this.addChild(new Wrapper(this, ...nodesToWrap));
    this.addOverlappingPushDown(event);
  }

  mkEventView(event, sourceLoc, classes = '') {
    if (event instanceof MicroVizEvents) {
      return new SendView(this, false, event, sourceLoc, classes);
    } else {
      return new EventView(this, event, sourceLoc, classes);
    }
  }

  get lastChild() { return this.children[this.children.length - 1]; }

  addChild(view) {
    if (view.classList.contains('firstInLine') &&
        this.children.length > 0) {
      this.DOM.appendChild(d('br'));
    }
    this.children.push(view);
    this.DOM.appendChild(view.DOM);
    this.microViz.fixHeightsFor(view);
  }

  popChild() {
    const view = this.children.pop();
    if (view.classList.contains('firstInLine') && 
        view.DOM.previousSibling.nodeName === 'BR') {
      this.DOM.removeChild(view.DOM.previousSibling);
    }
    this.DOM.removeChild(view.DOM);
    return view;
  }

  addEndSpacers() {
    range(this.lastEventNode.endLine + 1, this.endLine)
      .forEach(line => {
        const spacer = new Spacer(this, line);
        this.endSpacers.push(spacer);
        this.DOM.appendChild(spacer.DOM);
        this.microViz.fixHeightsFor(spacer);
      });
  }

  clearEndSpacers() {
    this.endSpacers.forEach(spacer => this.DOM.removeChild(spacer.DOM));
    this.endSpacers = [];
  }
}

class RemoteEventGroupView extends AbstractView {
  constructor(parent, remoteEventGroup, sourceLoc=remoteEventGroup.sourceLoc, classes='') {
    super(parent, sourceLoc, classes);
    this.remoteEventGroup = remoteEventGroup;
    this.eventViews = new WeakMap();
    this.events = [];
    this.render();

    this.remoteEventGroup.addListener('addEvent', event => this.addEvent(event));
    this.remoteEventGroup.addListener('removeEvent', event => this.removeEvent(event));
  }

  render() {
    this.DOM = d('remoteEventGroup', this.attributes);
    this.remoteEventGroup.events.forEach(event => this.addEvent(event));
  }

  addEvent(event) {
    const eventView = new EventView(this, event, this.sourceLoc, 'remote firstInLine lastInLine');
    this.eventViews.set(event, eventView);
    if (this.events.length > 0) {
      this.DOM.appendChild(d('br'));
    }
    this.DOM.appendChild(eventView.DOM);
    this.microViz.fixHeightsFor(event);

    this.events.push(eventView);
    if (window.debug === true) debugger;
  }

  removeEvent(event) {
    this.DOM.removeChild(this.eventViews.get(event).DOM);
  }
}

class Spacer extends AbstractView {
  constructor(parent, lineNumber) {
    super(parent, {
      startLineNumber: lineNumber,
      endLineNumber: lineNumber
    }, '');
    this.lineNumber = lineNumber;
    this.render();
  }

  render() {
    this.DOM = d('spacer', this.attributes);
  }
}

class Wrapper extends AbstractView {
  constructor(parent, ...views) {
    let classes = [];
    if (views[0].classList.contains('firstInLine')) {
      classes.push('firstInLine');
    }
    if (views[views.length - 1].classList.contains('lastInLine')) {
      classes.push('lastInLine');
    }

    super(parent, {
      startLineNumber: views[0].startLine,
      endLineNumber: views[views.length - 1].endLine
    }, classes.join(' '));
    this.views = views;
    this.render();
  }

  render() {
    this.DOM = d('wrapper', this.attributes, 
        ...flatten(this.views.map((v, idx) => {
          if (v.classList.contains('firstInLine') && idx > 0) {
            return [d('br'), v.DOM];
          } else {
            return [v.DOM];
          }
        })));
  }
}

class EventView extends AbstractView {
  constructor(parent, event, sourceLoc=event.sourceLoc, classes='') {
    super(parent, sourceLoc, classes);
    this.event = event;
    this.render();

    this.microViz.addEventView(this.event, this); // TODO
    this.DOM.onclick = (e) => {
      this.microViz.onClick(this.event);
      e.stopPropagation();
    };
    this.DOM.onmouseover = (e) => {
      this.microViz.onMouseover(this.event);
      e.stopPropagation();
    };
    this.DOM.onmouseout = (e) => {
      this.microViz.onMouseout(this.event);
      e.stopPropagation();
    };
  }

  render() {
    this.DOM = d('event', this.attributes, this.event.toMicroVizString());
  }
}
