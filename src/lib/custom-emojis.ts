import type { WorkspaceCustomEmoji } from "@/lib/types";

const CUSTOM_EMOJI_NAME_REGEX = /^[a-z0-9_]+$/;
const CUSTOM_SHORTCODE_REGEX = /^:([a-z0-9_]+):$/;

export function normalizeCustomEmojiName(value: string) {
  return value.trim().replace(/^:+|:+$/g, "").toLowerCase();
}

export function formatCustomEmojiShortcode(name: string) {
  return `:${normalizeCustomEmojiName(name)}:`;
}

export function isCustomEmojiShortcode(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  return CUSTOM_SHORTCODE_REGEX.test(value.trim().toLowerCase());
}

export function extractCustomEmojiName(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().toLowerCase().match(CUSTOM_SHORTCODE_REGEX);
  return match?.[1] ?? null;
}

export function validateCustomEmojiName(value: string) {
  const normalized = normalizeCustomEmojiName(value);
  if (!normalized) return "Emoji name is required";
  if (!CUSTOM_EMOJI_NAME_REGEX.test(normalized)) {
    return "Emoji name can only contain lowercase letters, numbers, and underscores";
  }
  return null;
}

export function buildCustomEmojiLookup(
  customEmojis?: WorkspaceCustomEmoji[] | null,
) {
  const lookup = new Map<string, WorkspaceCustomEmoji>();
  customEmojis?.forEach((emoji) => {
    lookup.set(emoji.name, emoji);
  });
  return lookup;
}

export function toPickerCustomEmojis(customEmojis?: WorkspaceCustomEmoji[] | null) {
  return (customEmojis ?? []).map((emoji) => ({
    id: emoji.name,
    names: [emoji.name],
    imgUrl: emoji.imageUrl,
  }));
}

export function buildTwemojiUrl(emoji: string) {
  const codepoints = Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter((value): value is string => Boolean(value))
    .join("-");

  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codepoints}.png`;
}

export function replaceCustomEmojiShortcodesInHtml(
  html: string,
  customEmojiLookup: Map<string, WorkspaceCustomEmoji>,
) {
  if (!html || typeof window === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const textNodes: Text[] = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  const shouldSkip = (node: Text) => {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest("code, pre"));
  };

  const buildEmojiNode = (emoji: WorkspaceCustomEmoji) => {
    const img = doc.createElement("img");
    img.src = emoji.imageUrl;
    img.alt = `:${emoji.name}:`;
    img.title = `:${emoji.name}:`;
    img.setAttribute("data-custom-emoji", emoji.name);
    img.className =
      "inline-block h-[1em] w-[1em] align-[-0.15em] object-contain";
    return img;
  };

  textNodes.forEach((node) => {
    if (shouldSkip(node)) return;

    const text = node.textContent ?? "";
    if (!text.includes(":")) return;

    const fragment = doc.createDocumentFragment();
    const regex = /:([a-z0-9_]+):/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let hasMatch = false;

    while ((match = regex.exec(text))) {
      const [fullMatch, rawName] = match;
      const name = rawName.toLowerCase();
      const emoji = customEmojiLookup.get(name);
      if (!emoji) continue;

      hasMatch = true;
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore) {
        fragment.appendChild(doc.createTextNode(textBefore));
      }
      fragment.appendChild(buildEmojiNode(emoji));
      lastIndex = match.index + fullMatch.length;
    }

    if (!hasMatch) return;

    const trailing = text.slice(lastIndex);
    if (trailing) {
      fragment.appendChild(doc.createTextNode(trailing));
    }
    node.parentNode?.replaceChild(fragment, node);
  });

  return doc.body.innerHTML;
}
