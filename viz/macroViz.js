"use strict";

class MacroViz extends CheckedEmitter {
  constructor(container, eventRecorder = null) {
    super();
    this.registerEvent('click', 'child', 'childView');
    this.registerEvent('mouseover', 'child', 'childView');
    this.registerEvent('mouseout', 'child', 'childView');

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

  onClick(event) { this.emit('click', event, this.nodeViews.get(event)); }
  onMouseover(event) { this.emit('mouseover', event, this.nodeViews.get(event)); }
  onMouseout(event) { this.emit('mouseout', event, this.nodeViews.get(event)); }
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
    this.label = d('label', {}, d('text', {}, this.event.sourceLoc.name));
    this.DOM = d('macroVizNode', {},
        this.label, this.children);

    this.label.onclick = (event) => this.macroViz.onClick(this.event);
    this.label.onmouseover = (event) => this.macroViz.onMouseover(this.event);
    this.label.onmouseout = (event) => this.macroViz.onMouseout(this.event);

    this.event.children.forEach(child => {
      this.addChild(child);
    });
  }

  addChild(child) {
    const childView = new NodeView(this, child);
    this.children.appendChild(childView.DOM);
  }
}
