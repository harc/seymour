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

function unique(arr) {
  return Array.from(new Set(arr));
}