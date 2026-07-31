"use client";

import Link from "@tiptap/extension-link";
import { getMarkRange, type Editor } from "@tiptap/core";

export type LinkDialogValue = {
  text: string;
  url: string;
};

const LINK_REL = "noopener noreferrer nofollow";
const LINK_CLASS = "text-blue-500 underline cursor-pointer";

export function createEditorLinkExtension() {
  return Link.configure({
    autolink: true,
    linkOnPaste: true,
    defaultProtocol: "https",
    openOnClick: false,
    HTMLAttributes: {
      class: LINK_CLASS,
    },
  });
}

export function normalizeLinkUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed}`;
}

function getActiveLinkRange(editor: Editor) {
  return getMarkRange(editor.state.selection.$from, editor.schema.marks.link);
}

export function getLinkDialogValue(editor: Editor): LinkDialogValue {
  const { from, to, empty } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, "\n").trim();
  const href =
    typeof editor.getAttributes("link").href === "string"
      ? String(editor.getAttributes("link").href)
      : "";

  if (!empty) {
    return {
      text: selectedText,
      url: href,
    };
  }

  const activeRange = getActiveLinkRange(editor);
  if (!activeRange) {
    return {
      text: "",
      url: href,
    };
  }

  return {
    text: editor.state.doc
      .textBetween(activeRange.from, activeRange.to, "\n")
      .trim(),
    url: href,
  };
}

export function applyLinkToEditor(editor: Editor, value: LinkDialogValue) {
  const href = normalizeLinkUrl(value.url);
  if (!href) return;

  const linkAttrs = {
    href,
    target: "_blank",
    rel: LINK_REL,
  };

  const { from, to, empty } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, "\n").trim();
  const activeRange = getActiveLinkRange(editor);
  const activeText = activeRange
    ? editor.state.doc.textBetween(activeRange.from, activeRange.to, "\n").trim()
    : "";
  const linkText = value.text.trim() || selectedText || activeText || href;

  if (empty) {
    if (activeRange) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: activeRange.from, to: activeRange.to })
        .insertContent({
          type: "text",
          text: linkText,
          marks: [{ type: "link", attrs: linkAttrs }],
        })
        .run();
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: linkText,
        marks: [{ type: "link", attrs: linkAttrs }],
      })
      .run();
    return;
  }

  if (value.text.trim() && value.text.trim() !== selectedText) {
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from, to },
        {
          type: "text",
          text: linkText,
          marks: [{ type: "link", attrs: linkAttrs }],
        },
      )
      .run();
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink(linkAttrs).run();
}

export function removeLinkFromEditor(editor: Editor) {
  const activeRange = getActiveLinkRange(editor);
  if (activeRange) {
    editor
      .chain()
      .focus()
      .setTextSelection({ from: activeRange.from, to: activeRange.to })
      .unsetLink()
      .run();
    return;
  }

  editor.chain().focus().unsetLink().run();
}
