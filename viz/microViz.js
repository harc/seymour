"use strict";

// toplevel class. persists across focuses. manages codemirror
class MicroViz extends CheckedEmitter {
  constructor(container, enableMicroViz) {
    super();
    this.registerEvent('click', 'DOMEvent', 'event', 'eventView');
    this.registerEvent('mouseover', 'DOMEvent', 'event', 'eventView');
    this.registerEvent('mouseout', 'DOMEvent', 'event', 'eventView');

    this.microViz = this;
    this.enableMicroViz = enableMicroViz;

    this.container = container;
    this.editor = CodeMirror(container);
    this.widgetForLine = {};

    this.render();
  }

  render() {
    this.microVizParent = d('microVizDiv', {});
    this.background = d('microVizBackground', {});
    this.microVizHolder = d('microVizHolder', {},
        this.background,
        this.microVizParent);
    this.container.appendChild(this.microVizHolder);
    this.container.classList.add('microViz');
  }

  // compositing and paths

  get currentPath() { return this.paths[this.currentPathIdx]; }

  setPaths(paths) {
    if (!this.enableMicroViz) {
      return;
    }

    this.eventViews = new Map();
    this.implementations = new Map();

    this.paths = paths;
    this.currentPathIdx = 0;

    Object.keys(this.widgetForLine)
      .forEach(line => {
        this.widgetForLine[line].clear();
      });
    this.widgetForLine = {};
    this.microVizParent.innerHTML = '';

    this.clearBackground();
    this.setupBackground();
  }

  setImplementation(sendView) {
    this.implementations.set(this.currentPath, sendView);
    this.currentPathIdx++;
  }

  setEventView(event, view) {
    this.eventViews.set(event, view);
  }

  addImplementation(microVizEvents) {
    if (!this.enableMicroViz) {
      return;
    }

    const implMicroVizEvents = microVizEvents;

    const parentPath = this.paths[this.currentPathIdx - 1];
    const parentView = this.implementations.get(parentPath) || null;

    if (parentView) {
      const implView = new SendView(parentView, implMicroVizEvents);
      parentView.addImplementation(implView);
    } else {
      const implView = new SendView(this, implMicroVizEvents);
      this.microVizParent.appendChild(implView.DOM);
      this.tagLines(implView.startLine, implView.endLine);
      this.fixHeightsFor(implView);
    }
  }

  // background/printer paper

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

  // line spacing logic

  fixHeight(lineNumber) {
    const $ = (el, query) => el.querySelector(query);
    const $$ = (el, query) => [].slice.call(el.querySelectorAll(query));

    const cmLineNumber = lineNumber - 1;

    const line = $(this.container, `.CodeMirror .line${lineNumber}.CodeMirror-line`);
    const itemsOnLine = $$(this.container, '*[endLine="' + lineNumber + '"]').concat(line);

    itemsOnLine.forEach(item => item.style.paddingBottom = '0px');

    const bottoms = new WeakMap();
    itemsOnLine.forEach(element => bottoms.set(element, element.getBoundingClientRect().bottom));
    const bottom = itemsOnLine
        .map(item => bottoms.get(item))
        .reduce((x, y) => Math.max(x, y), bottoms.get(line));

    this.spaceLine(cmLineNumber, line, bottoms.get(line), bottom);

    const bgline = $(this.container, 'line[startLine="' + lineNumber + '"]');
    this.inflate(bgline, bottoms.get(bgline), bottom);

    const spacers = $$(this.container, 'spacer[endLine="' + lineNumber + '"]');
    spacers.forEach(spacer => this.inflate(spacer, bottoms.get(spacer), bottom));

    const localEvents = $$(this.container, 'event[endLine="' + lineNumber + '"]:not(.remote)');
    localEvents.forEach(event => this.inflate(event, bottoms.get(event), bottom));

    const remoteEventGroups = $$(this.container, 'remoteEventGroup[endLine="' + lineNumber + '"]');
    remoteEventGroups.forEach(remoteEventGroup => 
        this.inflate(remoteEventGroup, bottoms.get(remoteEventGroup), bottom));
  }

  spaceLine(cmLineNumber, line, lineBottom, bottomY) {
    const paddingBottom = bottomY - lineBottom;
    if (this.widgetForLine.hasOwnProperty(cmLineNumber)) {
      this.widgetForLine[cmLineNumber].node.style.height = paddingBottom;
      this.widgetForLine[cmLineNumber].changed();
    } else {
      this.widgetForLine[cmLineNumber] = this.editor.addLineWidget(
        cmLineNumber, this.spacer(paddingBottom)
      );
    }
  }

  inflate(element, elementBottom, bottomY) {
    const currentPaddingBottom = parseInt(element.style.paddingBottom) || 0;
    const newPaddingBottom = bottomY - elementBottom;
    if (newPaddingBottom - currentPaddingBottom > 1 ||
        newPaddingBottom - currentPaddingBottom < -1) {
      element.style.paddingBottom = newPaddingBottom + 'px';
    }
  }

  spacer(height) {
    return d('div', {
      style: `height: ${height}px`
    });
  }

  fixHeightsFor(item) {
    item.extent.forEach(line => this.fixHeight(line));
  }

  // events

  onClick(DOMEvent, event) { 
    this.emit('click', DOMEvent, event, this.eventViews.get(event)); 
  }

  onMouseover(DOMEvent, event) { 
    this.emit('mouseover', DOMEvent, event, this.eventViews.get(event)); 
  }

  onMouseout(DOMEvent, event) { 
    this.emit('mouseout', DOMEvent, event, this.eventViews.get(event)); 
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
    this.DOM._model = this.model;
  }

  get startLine() { return this.attributes.startLine; }
  get endLine() { return this.attributes.endLine; }
  get extent() { return range(this.startLine, this.endLine); }
}

class SendView extends AbstractView {
  constructor(parent, microVizEvents, sourceLoc=microVizEvents.sourceLoc, classes='') {
    super(parent, sourceLoc, classes);
    this.microVizEvents = microVizEvents;
    this.attributes.isImplementation = this.isImplementation;
    this.model = microVizEvents;
    this.numGroups = 0;
    this.eventGroups = [];

    if (this.isImplementation) {
      // parent needs to know about this view before it renders
      this.microViz.setImplementation(this);
    }

    if (!this.isImplementation) {
      this.attributes.title = this.microVizEvents.programOrSendEvent.toDetailString();
    }

    this.render();

    this.microVizEvents.addListener('addEventGroup', eventGroup =>
        this.addEventGroup(eventGroup));

    if (!this.isImplementation) {
      this.microViz.setEventView(this.microVizEvents.programOrSendEvent, this);
      this.DOM.onclick = (e) => {
        this.microViz.onClick(e, this.microVizEvents.programOrSendEvent);
        e.stopPropagation();
      };
      this.DOM.onmouseover = (e) => {
        this.microViz.onMouseover(e, this.microVizEvents.programOrSendEvent);
        e.stopPropagation();
      };
      this.DOM.onmouseout = (e) => {
        this.microViz.onMouseout(e, this.microVizEvents.programOrSendEvent);
        e.stopPropagation();
      };
    }
  }

  get isImplementation() { return this.microVizEvents.isImplementation; }

  render() {
    this.DOM = d('send', this.attributes);
    if (!this.isImplementation) {
      this.addEmptySendGroup();
    }
    this.microVizEvents.eventGroups.forEach(group => this.addEventGroup(group));
    super.render();
  }

  addEmptySendGroup() {
    this.DOM.setAttribute('empty', true);
    this.DOM.appendChild(
      d('remoteEventGroup', {class: 'empty', startLine: this.startLine, endLine: this.endLine}, 
          d('emptySendDot', {}, '▪'))
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
  }

  addImplementation(implView) {
    if (!this.isImplementation) {
      throw new Error('tried to add an implementation to a non-implementation');
    }

    console.assert(this.numGroups === 1, 'implementation must have 1 event group');
    this.eventGroups[0].addImplementation(implView); 
  }
}

class LocalEventGroupView extends AbstractView {
  constructor(parent, localEventGroup, sourceLoc=localEventGroup.sourceLoc, classes='') {
    super(parent, sourceLoc, classes);
    this.localEventGroup = localEventGroup;
    this.model = localEventGroup;
    this.lastPopulatedLineNumber = sourceLoc.startLineNumber - 1;
    this.lastEventNode = null;
    this.children = {};
    this.spacers = {};

    this.extent.forEach(line => this.children[line] = []);
    this.extent.forEach(line => this.spacers[line] = null);

    // parent needs to know about this view before it renders
    this.parent.eventGroups.push(this);

    this.render();

    this.localEventGroup.addListener('addEvent', event => {
      this.addEvent(event);
    });
  }

  render() {
    this.DOM = d('localEventGroup', this.attributes);
    this.addSpacers();
    this.localEventGroup.events.forEach(event => this.addEvent(event));
    super.render();
  }

  // MAIN ADDEVENT LOGIC

  addEvent(event) {
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
  }

  addFirstInLine(event) {
    this.lastEventNode = this.mkEventView(event, event.sourceLoc, 'firstInLine lastInLine');
    this.lastPopulatedLineNumber = event.sourceLoc.endLineNumber;
    
    const referenceDOM = 
      this.spacers[this.lastEventNode.endLine].DOM.nextSibling || null;
    this.lastEventNode.extent.forEach(line => this.removeSpacer(line));
    this.addChild(this.lastEventNode, referenceDOM);
  }

  addOverlappingAtTop(event) {
    if (this.lastEventNode !== null) {
      this.lastEventNode.classList.remove('lastInLine');
    }
    this.lastEventNode = this.mkEventView(event, event.sourceLoc);
    range(this.lastPopulatedLineNumber + 1, event.sourceLoc.endLineNumber)
        .forEach(line => this.removeSpacer(line));
    this.lastPopulatedLineNumber =
        Math.max(this.lastPopulatedLineNumber, event.sourceLoc.endLineNumber);

    const childrenOnLine = this.children[event.sourceLoc.startLineNumber];
    const referenceDOM = childrenOnLine[childrenOnLine.length - 1].DOM.nextSibling;
    this.addChild(this.lastEventNode, referenceDOM);
  }

  addOverlappingPushDown(event) {
    if (this.lastEventNode !== null) {
      this.lastEventNode.classList.remove('lastInLine');
    }
    // const referenceDOM = this.lastEventNode.DOM.nextSibling;
    const previousNode = this.lastEventNode;
    // TODO: factor out creation
    this.lastEventNode = this.mkEventView(event, event.sourceLoc, 'pushDown');
    this.lastPopulatedLineNumber =
        Math.max(this.lastPopulatedLineNumber, event.sourceLoc.endLineNumber);

    range(this.lastPopulatedLineNumber + 1, event.endLine)
        .forEach(line => this.removeSpacer(line));
    const childrenOnLine = this.children[event.sourceLoc.startLineNumber];
    const referenceDOM = childrenOnLine[childrenOnLine.length - 1].DOM.nextSibling;

    const spacers =
        range(this.lastChild.startLine, event.sourceLoc.startLineNumber - 1).
        map(lineNumber => new Spacer(this, lineNumber));
    // if (spacers.length > 0) { this.lastEventNode.classList.add('firstInLine'); }
    this.addChild(new Wrapper(this, ...spacers, this.lastEventNode), referenceDOM);
  }

  addOverlappingInsideOut(event) {
    if (this.lastEventNode !== null) {
      this.lastEventNode.classList.remove('lastInLine');
    }
    const nodesToWrap = flatten(
      range(event.sourceLoc.startLineNumber, event.sourceLoc.endLineNumber)
        .map(line => this.children[line].concat(this.spacers[line]))
    ).filter(node => node !== null);
    const referenceDOM = nodesToWrap[nodesToWrap.length-1].DOM.nextSibling || null;
    nodesToWrap.forEach(node => this.removeChildOrSpacer(node));
    const wrapper = new Wrapper(this, ...nodesToWrap);
    this.addChild(wrapper, referenceDOM);
    this.addOverlappingPushDown(event);
  }

  addImplementation(implView) {
    // pick out nodes on implview's extent
    const nodesToWrap = unique(flatten(this.extent
        .map(line => this.children[line].concat(this.spacers[line])))
      .filter(node => node !== null)
      .filter(child => 
        !(child.startLine < implView.startLine  && child.endLine < implView.startLine) &&
        !(child.startLine > implView.endLine  && child.endLine > implView.endLine)));
    const referenceDOM = nodesToWrap[nodesToWrap.length-1].DOM.nextSibling || null;
    
    // remove those nodes
    nodesToWrap.forEach(node => this.removeChildOrSpacer(node));

    const parentWrapper = new Wrapper(this, ...nodesToWrap);
    if (implView.startLine > 1 && nodesToWrap.every(n => n instanceof Spacer)) {
      parentWrapper.classList.add('firstInLine');
    }
    this.addChildWithoutTracking(parentWrapper, referenceDOM);

    const startLine = nodesToWrap[0].startLine;
    const childNodes = [];
    range(startLine, implView.startLine - 1)
        .forEach(lineNumber => childNodes.push(new Spacer(this, lineNumber)));
    if (childNodes.length > 0) {
      implView.classList.add('firstInLine');
    }
    childNodes.push(implView);
    const childWrapper = new Wrapper(this, ...childNodes);
    childWrapper.classList.remove('firstInLine');
    this.addChildWithoutTracking(childWrapper, referenceDOM);
  } 

  // UTILS

  mkEventView(event, sourceLoc, classes = '') {
    if (event instanceof MicroVizEvents) {
      return new SendView(this, event, sourceLoc, classes + ' lastInLine');
    } else {
      return new EventView(this, event, sourceLoc, classes + ' lastInLine');
    }
  }

  get numChildren() { return flatten(Object.values(this.children)).length; }

  addChild(view, referenceDOM) {
    if (view.classList.contains('firstInLine') &&
        view.startLine > this.startLine) {
      this.DOM.insertBefore(d('br'), referenceDOM);
    }
    
    if (this.lastChild) {
      range(this.lastChild.endLine, view.startLine)
        .forEach(line => this.microViz.fixHeight(line));
    }

    // this.children[view.startLine].push(view);
    view.extent.forEach(line => {
      this.children[line].push(view);
    })
    this.lastChild = view;
    this.DOM.insertBefore(view.DOM, referenceDOM);
    this.microViz.fixHeightsFor(view);
  }

  addChildWithoutTracking(view, referenceDOM) {
    if (view.classList.contains('firstInLine') &&
        view.startLine > this.startLine) {
      this.DOM.insertBefore(d('br'), referenceDOM);
    }
    
    if (this.lastChild) {
      range(this.lastChild.endLine, view.startLine)
        .forEach(line => this.microViz.fixHeight(line));
    }
    this.DOM.insertBefore(view.DOM, referenceDOM);
    this.microViz.fixHeightsFor(view);
  }

  removeChildOrSpacer(view) {
    if (view instanceof Spacer) {
      this.removeSpacer(view.lineNumber);
    } else {
      const childrenOnLine = this.children[view.startLine];
      const viewIdx = childrenOnLine.indexOf(view);
      this.children[view.startLine] = childrenOnLine.splice(viewIdx, 1);

      if (view.classList.contains('firstInLine') && 
        view.DOM.previousSibling) {
          this.DOM.removeChild(view.DOM.previousSibling);
      }
      this.DOM.removeChild(view.DOM);
    }
  }

  addSpacers() {
    this.extent
      .forEach(line => {
        const spacer = new Spacer(this, line);
        this.spacers[line] = spacer;
        if (line > this.startLine) {
          this.DOM.appendChild(d('br'));
        }
        this.DOM.appendChild(spacer.DOM);
        // this.microViz.fixHeightsFor(spacer);
      })
  }

  removeSpacer(line) {
    if (this.spacers[line]) {
      if (line > this.startLine) {
        this.DOM.removeChild(this.spacers[line].DOM.previousSibling);
      }
      this.DOM.removeChild(this.spacers[line].DOM);
      this.spacers[line] = null;
    }
  }
}

class RemoteEventGroupView extends AbstractView {
  constructor(parent, remoteEventGroup, sourceLoc=remoteEventGroup.sourceLoc, classes='') {
    super(parent, sourceLoc, classes);
    this.remoteEventGroup = remoteEventGroup;
    this.model = remoteEventGroup;
    this.eventViews = new Map();
    this.numShownEvents = 0;

    // parent needs to know about this view before it renders
    this.parent.eventGroups.push(this);

    this.render();

    this.remoteEventGroup.addListener('addEvent', event => this.addEvent(event));
    this.remoteEventGroup.addListener('removeEvent', event => this.removeEvent(event));
  }

  render() {
    this.DOM = d('remoteEventGroup', this.attributes);
    this.remoteEventGroup.events.forEach(event => this.addEvent(event));
    super.render();
  }

  addEvent(event) {
    const eventView = new EventView(this, event, this.sourceLoc, 'remote firstInLine lastInLine');
    this.eventViews.set(event, eventView);
    if (this.numShownEvents > 0) {
      this.DOM.appendChild(d('br'));
    }
    this.DOM.appendChild(eventView.DOM);
    this.microViz.fixHeightsFor(this);

    this.numShownEvents++;
  }

  removeEvent(event) {
    const eventView = this.eventViews.get(event);
    if (eventView.DOM.previousSibling && eventView.DOM.previousSibling.nodeName === 'BR') {
      this.DOM.removeChild(eventView.DOM.previousSibling);
    }
    // if we're getting rid of the first event in the group, 
    // make sure the group doesn't start with a <br> tag
    if (!(eventView.DOM.previousSibling) && eventView.DOM.nextSibling) {
      this.DOM.removeChild(eventView.DOM.nextSibling);
    }
    this.DOM.removeChild(eventView.DOM);
    this.numShownEvents--;
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
    
    let firstInLine = false;
    for (let view of views) {
      if (view instanceof Spacer) { continue; }
      if (view.classList.contains('firstInLine')) { 
        firstInLine = true; 
      }
      break;
    }

    if (firstInLine) {
      classes.push('firstInLine');
    } else {
      for (let view of views) {
        if (view instanceof Spacer) { continue; }
        else {
          view.classList.add('firstInLine');
          break;
        }
      }
    }
    // if (views[views.length - 1].classList.contains('lastInLine')) {
    //   classes.push('lastInLine');
    // }

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
          if ((v.classList.contains('firstInLine') || v instanceof Spacer) && idx > 0) {
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
    this.model = event;

    this.attributes.eventType = event.constructor.name;

    this.render();

    this.microViz.setEventView(this.event, this);
    this.DOM.onclick = (e) => {
      this.microViz.onClick(e, this.event);
      e.stopPropagation();
    };
    this.DOM.onmouseover = (e) => {
      this.microViz.onMouseover(e, this.event);
      e.stopPropagation();
    };
    this.DOM.onmouseout = (e) => {
      this.microViz.onMouseout(e, this.event);
      e.stopPropagation();
    };
  }

  render() {
    this.DOM = d('event', this.attributes, this.event.toMicroVizString());
    super.render();
  }
}
