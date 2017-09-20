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
    this.eventRecorder.addListener('activateSend', (send) =>
        this.activateSend(send))
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
    } else if (child instanceof ErrorEvent) {
      const parentView = 
          this.nodeViews.get(parent) || this.nodeViews.get(parent.env.programOrSendEvent);
      parentView.error();
    }
  }

  activateSend(send) {
    this.nodeViews.get(send).activate();
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
    this.DOM = d('macroVizNode', {
        isFocusable: !!(this.event.activationEnv && this.event.activationEnv.sourceLoc)
      },
      this.label, this.children);

    this.label._event = this.event;
    this.label.onclick = (event) => this.macroViz.onClick(event, this.event);
    this.label.onmouseover = (event) => this.macroViz.onMouseover(event, this.event);
    this.label.onmouseout = (event) => this.macroViz.onMouseout(event, this.event);

    if (!(this.event.activationEnv && this.event.activationEnv.sourceLoc)) {
      this.collapse();
    }

    this.event.children.forEach(child => {
      this.addChild(child);
    });
  }

  activate() {
    this.DOM.setAttribute('isFocusable', true)
    this.collapse(false)
  }

  addChild(child) {
    const childView = new NodeView(this, child);
    this.children.appendChild(childView.DOM);
  }

  collapse(collapse = true) {
    this.DOM.classList.toggle('collapsed', collapse);
  }

  error() {
    this.DOM.classList.add('error');
    if (this.parent && this.parent.error != null) {
      this.parent.error();
    }
  }
}
