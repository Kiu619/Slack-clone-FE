"use client";

import DOMPurify from "dompurify";

export function sanitizeSearchExcerpt(excerpt: string) {
  return DOMPurify.sanitize(excerpt, {
    ALLOWED_TAGS: ["mark", "a", "strong", "em", "code", "span", "br", "p"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightSearchExcerpt(html: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return html;
  if (/<mark\b/i.test(html)) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const regex = new RegExp(escapeRegExp(trimmed), "ig");
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.nodeValue?.trim()) continue;
    const parentName = node.parentElement?.tagName.toLowerCase();
    if (parentName === "mark" || parentName === "a") continue;
    textNodes.push(node);
  }

  textNodes.forEach((node) => {
    const value = node.nodeValue ?? "";
    regex.lastIndex = 0;
    if (!regex.test(value)) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of value.matchAll(regex)) {
      const offset = match.index ?? 0;
      if (offset > lastIndex) {
        fragment.appendChild(
          document.createTextNode(value.slice(lastIndex, offset)),
        );
      }

      const mark = document.createElement("mark");
      mark.textContent = match[0];
      fragment.appendChild(mark);
      lastIndex = offset + match[0].length;
    }

    if (lastIndex < value.length) {
      fragment.appendChild(document.createTextNode(value.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
  });

  return doc.body.innerHTML;
}
