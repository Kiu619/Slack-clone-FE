"use client";

import DOMPurify from "dompurify";

const RICH_TEXT_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "s",
    "u",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "span",
    "img",
  ],
  ALLOWED_ATTR: [
    "href",
    "target",
    "rel",
    "class",
    "src",
    "alt",
    "title",
    "data-custom-emoji",
  ],
};

function hardenAnchors(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("a").forEach((anchor) => {
    const href = anchor.getAttribute("href")?.trim() ?? "";

    if (!href || /^javascript:/i.test(href)) {
      anchor.removeAttribute("href");
      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");
      return;
    }

    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer nofollow");
  });

  return doc.body.innerHTML;
}

export function sanitizeRenderedRichText(content: string) {
  if (typeof window === "undefined") return content;
  const sanitized = DOMPurify.sanitize(content, RICH_TEXT_SANITIZE_OPTIONS);
  return hardenAnchors(sanitized);
}
