import {
  mergeAttributes,
  nodeInputRule,
  nodePasteRule,
  Node,
} from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { normalizeCustomEmojiName } from "@/lib/custom-emojis";
import type { WorkspaceCustomEmoji } from "@/lib/types";

export type ResolveCustomEmoji = (
  name: string,
) => WorkspaceCustomEmoji | null | undefined;

type CustomEmojiOptions = {
  resolveEmoji: ResolveCustomEmoji;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customEmoji: {
      insertCustomEmoji: (name: string) => ReturnType;
    };
  }
}

export const CustomEmojiNode = Node.create<CustomEmojiOptions>({
  name: "customEmoji",
  inline: true,
  group: "inline",
  atom: true,
  selectable: false,
  draggable: false,

  addOptions() {
    return {
      resolveEmoji: () => null,
    };
  },

  addAttributes() {
    return {
      name: {
        default: "",
      },
      imageUrl: {
        default: "",
      },
      alt: {
        default: "",
      },
      title: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[data-custom-emoji]",
        getAttrs: (element) => {
          const node = element as HTMLElement;
          const name = normalizeCustomEmojiName(
            node.getAttribute("data-custom-emoji") ??
              node.getAttribute("alt") ??
              "",
          );
          const imageUrl = node.getAttribute("src")?.trim() ?? "";
          if (!name || !imageUrl) return false;

          return {
            name,
            imageUrl,
            alt: `:${name}:`,
            title: `:${name}:`,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const name = normalizeCustomEmojiName(HTMLAttributes.name ?? "");
    const imageUrl = (HTMLAttributes.imageUrl ?? "").trim();

    if (!name || !imageUrl) {
      return ["span", { "data-custom-emoji-missing": "true" }, `:${name}:`];
    }

    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        src: imageUrl,
        alt: HTMLAttributes.alt || `:${name}:`,
        title: HTMLAttributes.title || `:${name}:`,
        "data-custom-emoji": name,
        class:
          "inline-block h-[1em] w-[1em] align-[-0.15em] object-contain",
      }),
    ];
  },

  renderText({ node }) {
    return "";
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /:([a-z0-9_]+):$/i,
        type: this.type,
        getAttributes: (match) => {
          const name = normalizeCustomEmojiName(match[1] ?? "");
          const emoji = this.options.resolveEmoji(name);
          if (!emoji) return false;

          return {
            name: emoji.name,
            imageUrl: emoji.imageUrl,
            alt: `:${emoji.name}:`,
            title: `:${emoji.name}:`,
          };
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: /:([a-z0-9_]+):/gi,
        type: this.type,
        getAttributes: (match) => {
          const name = normalizeCustomEmojiName(match[1] ?? "");
          const emoji = this.options.resolveEmoji(name);
          if (!emoji) return false;

          return {
            name: emoji.name,
            imageUrl: emoji.imageUrl,
            alt: `:${emoji.name}:`,
            title: `:${emoji.name}:`,
          };
        },
        getContent: (attrs) => [{ type: this.name, attrs }],
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleTextInput: (view, from, to, text) => {
            if (text !== ":") return false;

            const state = view.state;
            const $from = state.doc.resolve(from);
            const blockStart = $from.start();
            const beforeText = state.doc.textBetween(
              blockStart,
              from,
              "\n",
              "\0",
            );
            const candidate = `${beforeText}${text}`;
            const match = candidate.match(/:([a-z0-9_]+):$/i);
            if (!match) return false;

            const name = normalizeCustomEmojiName(match[1] ?? "");
            const emoji = this.options.resolveEmoji(name);
            if (!emoji) return false;

            const start = $from.start() + candidate.lastIndexOf(match[0]);
            const tr = state.tr.replaceWith(start, from, this.type.create({
              name: emoji.name,
              imageUrl: emoji.imageUrl,
              alt: `:${emoji.name}:`,
              title: `:${emoji.name}:`,
            }));
            view.dispatch(tr.scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});
