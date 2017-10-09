class PathMatcher {
  constructor(path, env = null) {
    this.path = path;
    this.idx = env ? path.length : 0;
    this.envAtIdx = env;
  }

  reset(globalEnv) {
    this.idx = 0;
    this.envAtIdx = globalEnv;
  }

  get env() {
     return this.idx === this.path.length ? this.envAtIdx : null;
  }

  processEvent(child, parent) {
    console.assert(this.idx < this.path.length);
    if (parent && parent.activationEnv &&
        this.envAtIdx === parent.activationEnv &&
        child.activationPathToken === this.path[this.idx]) {
      this.idx++;
      this.envAtIdx = child.activationEnv;
    }
  }
}

function getPathMatchers(activationEnv) {
  const pathMatchers = [];
  let env = activationEnv;
  while (env) {
    pathMatchers.unshift(getPathMatcher(env));
    env = env.parentEnv;
  }
  return pathMatchers;
}

function getPathMatcher(activationEnv) {
  return new PathMatcher(getPath(activationEnv), activationEnv);
}

function getPath(activationEnv) {
  const path = [];
  while (true) {
    const callerEnv = activationEnv.callerEnv;
    if (callerEnv) {
      path.push(activationEnv.programOrSendEvent.activationPathToken);
      activationEnv = callerEnv.programOrSendEvent.activationEnv;
    } else {
      break;
    }
  }
  path.reverse();
  return path;
}