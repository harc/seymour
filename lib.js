var now = Date.now || function() {
  return new Date().getTime();
};


function debounce(func, wait, immediate) {
  var timeout, args, context, timestamp, result;

  var later = function() {
    var last = now() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      }
    }
  };

  return function() {
    context = this;
    args = arguments;
    timestamp = now();
    var callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };
};

function range(from, to) {
  const ans = [];
  for (let x = from; x <= to; x++) {
    ans.push(x);
  }
  return ans;
}

function d(elementType, attributes, ...children) {
  const node = document.createElement(elementType);
  if (attributes == null && children.length === 0) {
    return node;
  }

  Object.keys(attributes).forEach(name => node.setAttribute(name, attributes[name]));
  for (let child of children) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function spaces(n) {
  let str = '';
  while (n-- > 0) {
    str += ' ';
  }
  return str;
}

function flatten(arrs) {
  return [].concat.apply([], arrs);
}
