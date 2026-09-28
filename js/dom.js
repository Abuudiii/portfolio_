export const $ = (sel) => document.querySelector(sel);

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function link(href, text, className) {
  const a = el('a', className, text);
  a.href = href;
  if (/^https?:/.test(href)) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  return a;
}

export function chips(items) {
  const ul = el('ul', 'chips');
  for (const item of items) ul.append(el('li', null, item));
  return ul;
}
