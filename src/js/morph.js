/* ==========================================================================
   Tiny DOM morph.
   Screens are written as HTML template strings (easy to read and edit).
   Instead of replacing innerHTML on every tap – which loses focus, scroll
   positions of chip rows and running transitions – we patch the existing
   DOM so only what changed is touched.
   Elements can carry data-key="…" to be matched across re-orderings.
   ========================================================================== */

const tpl = document.createElement("template");

export function morph(container, html) {
  tpl.innerHTML = html;
  patchChildren(container, tpl.content);
}

const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute("data-key") || n.id || null : null);

function same(a, b) {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType !== 1) return true;
  return a.tagName === b.tagName && keyOf(a) === keyOf(b);
}

function patchChildren(from, to) {
  const keyed = new Map();
  for (const c of from.childNodes) { const k = keyOf(c); if (k) keyed.set(k, c); }
  let cur = from.firstChild;
  for (const next of Array.from(to.childNodes)) {
    const k = keyOf(next);
    let match = null;
    if (k && keyed.has(k)) match = keyed.get(k);
    else if (cur && !keyOf(cur) && same(cur, next)) match = cur;

    if (match && same(match, next)) {
      if (match !== cur) from.insertBefore(match, cur);
      patchNode(match, next);
      cur = match.nextSibling;
    } else {
      from.insertBefore(document.importNode(next, true), cur);
    }
  }
  while (cur) { const n = cur.nextSibling; from.removeChild(cur); cur = n; }
}

function patchNode(a, b) {
  if (a.nodeType === 3 || a.nodeType === 8) {
    if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    return;
  }
  // attributes
  for (const { name } of Array.from(a.attributes)) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of Array.from(b.attributes)) if (a.getAttribute(name) !== value) a.setAttribute(name, value);

  const tag = a.tagName;
  if (tag === "INPUT") {
    const v = b.getAttribute("value") ?? "";
    if (a !== document.activeElement && a.value !== v) a.value = v;
    a.checked = b.hasAttribute("checked");
    return;
  }
  if (tag === "TEXTAREA") { if (a !== document.activeElement) a.value = b.textContent; return; }
  patchChildren(a, b);
  if (tag === "SELECT") {
    const i = Array.from(b.options).findIndex((o) => o.hasAttribute("selected"));
    if (i >= 0 && a.selectedIndex !== i) a.selectedIndex = i;
  }
}
