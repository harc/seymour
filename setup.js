// APPLICATION STATE. THIS STUFF IS GLOBAL

window.microViz = new MicroViz(microVizContainer);
window.editor = microViz.editor;
editor.setOption('lineNumbers', true);

window.macroViz = new MacroViz(macroVizContainer);

window.pathMatchers = null;