'use client'

import { LinkInputDialog } from '@/components/dialogs/link-input-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppTranslation } from '@/hooks/use-translation'
import Code from '@tiptap/extension-code'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  applyLinkToEditor,
  createEditorLinkExtension,
  getLinkDialogValue,
  removeLinkFromEditor,
  type LinkDialogValue,
} from '@/lib/tiptap-link'
import { type EmojiClickData, Theme } from 'emoji-picker-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuBold,
  LuCode,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuSmile,
  LuSquareCode,
  LuStrikethrough,
  LuUnderline
} from 'react-icons/lu'
import { MdFormatColorText } from 'react-icons/md'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface AboutMeEditorProps {
  initialContent?: string
  onContentChange?: (html: string) => void
}

const AboutMeEditor = ({ initialContent = '', onContentChange }: AboutMeEditorProps) => {
  const t = useAppTranslation("profile");
  const {theme} = useTheme()
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkDialogValue, setLinkDialogValue] = useState<LinkDialogValue>({
    text: '',
    url: '',
  })
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [, forceUpdate] = useState({})
  const emojiPickerRef = useRef<HTMLDivElement>(null)


  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        hardBreak: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: { class: 'list-disc pl-6' },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: { class: 'list-decimal pl-6' },
        },
        listItem: {
          HTMLAttributes: { },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-white dark:bg-[#1A1D21] text-[#e8e8e8] rounded p-2 font-mono text-sm',
          },
        },
        // Tắt inline code của StarterKit để dùng extension riêng với config
        code: false,
      }),
      // Inline code extension riêng để có thể style
      Code.configure({
        HTMLAttributes: {
          class: 'font-mono text-sm bg-[#2a2d31] text-[#e8e8e8] px-1.5 py-0.5 rounded border border-[#797c814d]',
          spellcheck: 'false',
        },
      }),
      Placeholder.configure({
        placeholder: t("editor.placeholder"),
      }),
      createEditorLinkExtension(),
      Underline,
    ],
    editorProps: {
      attributes: {
        class:
          'max-w-none focus:outline-none min-h-[100px] overflow-y-auto px-3 py-2 text-[15px] leading-tight scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900',
      },
    },
    content: initialContent,
    immediatelyRender: false,
    editable: true,
    onUpdate: ({ editor: e }) => {
      forceUpdate({})
      onContentChange?.(e.getHTML())
    },
    onSelectionUpdate: () => {
      forceUpdate({})
    },
  })

  // Close emoji picker khi click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  const handleSubmit = useCallback(() => {
    // AboutMeEditor không tự submit — submission được xử lý bởi dialog cha
  }, [])

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      if (!editor) return
      editor.chain().focus().insertContent(emojiData.emoji).run()
      setShowEmojiPicker(false)
    },
    [editor],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
      return
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      if (editor?.isActive('bulletList') || editor?.isActive('orderedList')) {
        editor?.commands.splitListItem('listItem')
      } else {
        editor?.chain().focus().splitBlock().run()
      }
    }
  }

  const isMarkActive = (markName: string) => {
    if (!editor) return false
    if (editor.isActive(markName)) return true
    const { storedMarks } = editor.state
    if (storedMarks) {
      return storedMarks.some((mark) => mark.type.name === markName)
    }
    return false
  }

  const toggleBold = () => { editor?.chain().focus().toggleBold().run(); forceUpdate({}) }
  const openLinkDialog = () => {
    if (!editor) return
    setLinkDialogValue(getLinkDialogValue(editor))
    setShowLinkInput(true)
  }
  const toggleItalic = () => { editor?.chain().focus().toggleItalic().run(); forceUpdate({}) }
  const toggleStrike = () => { editor?.chain().focus().toggleStrike().run(); forceUpdate({}) }
  const toggleUnderline = () => { editor?.chain().focus().toggleUnderline().run(); forceUpdate({}) }
  const toggleCode = () => { editor?.chain().focus().toggleCode().run(); forceUpdate({}) }
  const toggleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run()
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run()
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run()

  if (!editor) return null

  return (
    <div className="relative">
      <div
        className={`border rounded-lg bg-white dark:bg-[#1A1D21] transition-colors ${'border-[#797c814d] hover:border-[#797c81]'
          }`}
      >
        {/* Top Toolbar: Formatting */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#797c814d]">
          <ToolbarButton onClick={toggleBold} active={isMarkActive('bold')} tooltip={t("editor.toolbar.bold")}>
            <LuBold size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleItalic} active={isMarkActive('italic')} tooltip={t("editor.toolbar.italic")}>
            <LuItalic size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleStrike} active={isMarkActive('strike')} tooltip={t("editor.toolbar.strikethrough")}>
            <LuStrikethrough size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleUnderline} active={isMarkActive('underline')} tooltip={t("editor.toolbar.underline")}>
            <LuUnderline size={16} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton onClick={toggleBulletList} active={editor.isActive('bulletList')} tooltip={t("editor.toolbar.bulletList")}>
            <LuList size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleOrderedList} active={editor.isActive('orderedList')} tooltip={t("editor.toolbar.orderedList")}>
            <LuListOrdered size={16} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton onClick={openLinkDialog} active={editor.isActive('link')} tooltip={t("editor.toolbar.insertLink")}>
            <LuLink size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleCode} active={isMarkActive('code')} tooltip={t("editor.toolbar.inlineCode")}>
            <LuCode size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleCodeBlock} active={editor.isActive('codeBlock')} tooltip={t("editor.toolbar.codeBlock")}>
            <LuSquareCode size={16} />
          </ToolbarButton>
        </div>

        {/* Editor Content */}
        <div onKeyDown={handleKeyDown}>
          <EditorContent editor={editor} />
        </div>

        {/* Bottom Toolbar: Media + Send */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <ToolbarButton tooltip={t("editor.toolbar.formatText")}>
              <MdFormatColorText size={16} />
            </ToolbarButton>

            <Divider />

            {/* Emoji Picker */}
            <div className="relative" ref={emojiPickerRef}>
              <ToolbarButton
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                active={showEmojiPicker}
                tooltip={t("editor.toolbar.emoji")}
              >
                <LuSmile size={16} />
              </ToolbarButton>
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 z-50">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                    width={350}
                    height={400}
                    searchPlaceHolder="Search emoji..."
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {showLinkInput && (
        <LinkInputDialog
          open={showLinkInput}
          setOpen={setShowLinkInput}
          initialText={linkDialogValue.text}
          initialUrl={linkDialogValue.url}
          onSave={(value) => {
            if (!editor) return
            applyLinkToEditor(editor, value)
            forceUpdate({})
          }}
          onRemove={
            editor?.isActive('link')
              ? () => {
                  if (!editor) return
                  removeLinkFromEditor(editor)
                  forceUpdate({})
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <span className="h-4 w-px bg-[#797c814d] mx-0.5" />
}

interface ToolbarButtonProps {
  onClick?: () => void
  active?: boolean
  tooltip: string
  children: React.ReactNode
  disabled?: boolean
}

function ToolbarButton({ onClick, active, tooltip, children, disabled }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={`cursor-pointer p-1.5 rounded hover:bg-[#e8e8e8] dark:hover:bg-[#222529] transition-colors ${active ? 'bg-[#e8e8e8] dark:bg-[#222529] dark:text-white' : 'dark:text-[#d1d2d3]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export default AboutMeEditor
