"use strict";

class MacroViz extends CheckedEmitter {
  constructor(container, eventRecorder = null) {
    super();
    this.registerEvent('click', 'event', 'child', 'childView');
    this.registerEvent('mouseover', 'event', 'child', 'childView');
    this.registerEvent('mouseout', 'event', 'child', 'childView');

    this.macroViz = this;

    this.container = container;
    this.container.classList.add('macroViz');

    if (eventRecorder !== null) {
      this.setEventRecorder(eventRecorder);
    }
  }

  setEventRecorder(eventRecorder) {
    this.eventRecorder = eventRecorder;
    this.container.innerHTML = '';
    this.nodeViews = new Map();

    this.eventRecorder.addListener('addChild', (child, parent) =>
        this.addChild(child, parent));
    this.eventRecorder.addListener('addRoot', (root) =>
        this.addRoot(root));
  }

  get events() {
    if (this.nodeViews) {
      return Array.from(this.nodeViews.keys());
    } else {
      return [];
    }
  }

  getNodeView(event) {
    return this.nodeViews.get(event);
  }

  addRoot(root) {
    this.topLevelNode = new NodeView(this, root);
    this.container.appendChild(this.topLevelNode.DOM);
  }

  addChild(child, parent) {
    if (child instanceof SendEvent || child instanceof ProgramEvent) {
      this.nodeViews.get(parent).addChild(child);
    }
  }

  setView(child, childView) {
    this.nodeViews.set(child, childView);
  }

  onClick(event, child) { this.emit('click', event, child, this.nodeViews.get(event)); }
  onMouseover(event, child) { this.emit('mouseover', event, child, this.nodeViews.get(event)); }
  onMouseout(event, child) { this.emit('mouseout', event, child, this.nodeViews.get(event)); }
}

class NodeView {
  constructor(parent, event) {
    this.parent = parent;
    this.macroViz = parent.macroViz;
    this.event = event;

    this.macroViz.setView(this.event, this);
    this.render();
  }

  render() {
    this.children = d('children', {});
    this.label = d('label', {});
    this.DOM = d('macroVizNode', {isFocusable: !!this.event.activationEnv.sourceLoc},
        this.label, this.children);

    this.label._event = this.event;
    this.label.onclick = (event) => this.macroViz.onClick(event, this.event);
    this.label.onmouseover = (event) => this.macroViz.onMouseover(event, this.event);
    this.label.onmouseout = (event) => this.macroViz.onMouseout(event, this.event);

    this.event.children.forEach(child => {
      this.addChild(child);
    });
  }

  addChild(child) {
    const childView = new NodeView(this, child);
    this.children.appendChild(childView.DOM);
  }
}
