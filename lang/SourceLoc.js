"use strict";

class SourceLoc {
  constructor(startPos, endPos, startLineNumber, endLineNumber) {
    this.startPos = startPos;
    this.endPos = endPos;
    this.startLineNumber = startLineNumber;
    this.endLineNumber = endLineNumber;
  }

  equals(sourceLoc) {
    return this.startPos === sourceLoc.startPos && this.endPos === sourceLoc.endPos;
  }

  contains(sourceLoc) {
    return this.startPos <= sourceLoc.startPos && sourceLoc.endPos <= this.endPos;
  }

  strictlyContains(sourceLoc) {
    return this.contains(sourceLoc) && !this.equals(sourceLoc);
  }

  containsIdx(pos) {
    return this.startPos <= pos && pos < this.endPos;
  }
}
