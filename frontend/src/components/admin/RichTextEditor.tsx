"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  ImageIcon,
  RemoveFormatting,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";
import { useUploadMediaMutation } from "@/store/adminApi";
import { toast } from "sonner";

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ld-muted)] transition",
        "hover:bg-white/10 hover:text-[var(--ld-ink)] disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-[var(--ld-accent-soft)] text-[var(--ld-accent)] shadow-sm ring-1 ring-[var(--ld-accent)]/40"
      )}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = "Write content…",
  disabled,
  minHeight = "10rem",
}: RichTextEditorProps) {
  const [uploadMedia, { isLoading: uploading }] = useUploadMediaMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: id ?? "",
        class: cn(
          "prose prose-invert max-w-none px-3 py-3 outline-none focus:outline-none",
          "min-h-[10rem] text-sm leading-relaxed text-[var(--ld-ink)]",
          "[&_a]:text-[var(--ld-accent)] [&_a]:underline",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_h1]:font-display [&_h1]:text-2xl [&_h1]:text-[var(--ld-ink)]",
          "[&_h2]:font-display [&_h2]:text-xl [&_h2]:text-[var(--ld-ink)]",
          "[&_h3]:font-display [&_h3]:text-lg [&_h3]:text-[var(--ld-ink)]",
          "[&_img]:my-3 [&_p]:my-2",
          "[&_.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.is-editor-empty:first-child::before]:float-left",
          "[&_.is-editor-empty:first-child::before]:h-0",
          "[&_.is-editor-empty:first-child::before]:text-[var(--ld-faint)]",
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        ),
        style: `min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    if (next === lastEmitted.current) return;
    if (editor.getHTML() === next) return;
    lastEmitted.current = next;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter link URL", previous || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  }, [editor]);

  const onPickImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onImageSelected = useCallback(
    async (file?: File | null) => {
      if (!file || !editor) return;
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("folder", "editor");
        const item = await uploadMedia(body).unwrap();
        const src =
          resolveMediaUrl(item.url) ||
          resolveMediaUrl((item as { path?: string }).path) ||
          item.url;
        if (!src) throw new Error("Upload succeeded but no URL was returned");
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Image upload failed");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor, uploadMedia]
  );

  const blockLabel = !editor
    ? "Normal"
    : editor.isActive("heading", { level: 1 })
      ? "Heading 1"
      : editor.isActive("heading", { level: 2 })
        ? "Heading 2"
        : editor.isActive("heading", { level: 3 })
          ? "Heading 3"
          : "Normal";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-[var(--ld-line-strong)] bg-[#0d1424] shadow-sm",
        disabled && "opacity-60"
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--ld-line)] bg-white/5 px-2 py-1.5">
        <div className="relative mr-1">
          <select
            aria-label="Text style"
            disabled={disabled || !editor}
            value={
              editor?.isActive("heading", { level: 1 })
                ? "h1"
                : editor?.isActive("heading", { level: 2 })
                  ? "h2"
                  : editor?.isActive("heading", { level: 3 })
                    ? "h3"
                    : "p"
            }
            onChange={(e) => {
              if (!editor) return;
              const v = e.target.value;
              const chain = editor.chain().focus();
              if (v === "h1") chain.toggleHeading({ level: 1 }).run();
              else if (v === "h2") chain.toggleHeading({ level: 2 }).run();
              else if (v === "h3") chain.toggleHeading({ level: 3 }).run();
              else chain.setParagraph().run();
            }}
            className="h-8 appearance-none rounded-md border border-[var(--ld-line)] bg-[#0d1424] py-1 pl-2 pr-7 text-sm font-medium text-[var(--ld-ink)] outline-none hover:bg-white/10"
          >
            <option value="p" className="bg-[#0d1424] text-[var(--ld-ink)]">Normal</option>
            <option value="h1" className="bg-[#0d1424] text-[var(--ld-ink)]">Heading 1</option>
            <option value="h2" className="bg-[#0d1424] text-[var(--ld-ink)]">Heading 2</option>
            <option value="h3" className="bg-[#0d1424] text-[var(--ld-ink)]">Heading 3</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ld-faint)]" />
          <span className="sr-only">{blockLabel}</span>
        </div>

        <ToolbarButton
          title="Bold"
          disabled={disabled || !editor}
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" strokeWidth={2.5} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          disabled={disabled || !editor}
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          disabled={disabled || !editor}
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-[var(--ld-line)]" />

        <ToolbarButton
          title="Numbered list"
          disabled={disabled || !editor}
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          disabled={disabled || !editor}
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-[var(--ld-line)]" />

        <ToolbarButton title="Insert link" disabled={disabled || !editor} active={editor?.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Insert image"
          disabled={disabled || !editor || uploading}
          onClick={onPickImage}
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-[var(--ld-line)]" />

        <ToolbarButton
          title="Clear formatting"
          disabled={disabled || !editor}
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().setParagraph().run()
          }
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onImageSelected(e.target.files?.[0])}
      />
    </div>
  );
}
