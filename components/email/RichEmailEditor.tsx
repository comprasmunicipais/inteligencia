'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Table as TableIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';

interface RichEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  onSwitchToText: () => void;
}

export default function RichEmailEditor({ value, onChange, onSwitchToText }: RichEmailEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[300px] p-4 outline-none focus:outline-none text-slate-800',
      },
    },
  });

  // Sync external value changes (e.g. IA generation) into editor
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const handleInsertVariable = useCallback(
    (variable: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(variable).run();
    },
    [editor],
  );

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL do link:', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleInsertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const btn = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    title: string,
    disabled = false,
  ) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded p-1.5 transition ${
        active
          ? 'bg-[#0f49bd] text-white'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      } disabled:opacity-40`}
    >
      {icon}
    </button>
  );

  if (!editor) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* Top toolbar — variables + mode switch */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Inserir:</span>
        {(['[Nome]', '[Municipio]', '[Estado]'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => handleInsertVariable(v)}
            className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-[#0f49bd] transition hover:bg-blue-100"
          >
            {v}
          </button>
        ))}
        <div className="ml-auto">
          <button
            type="button"
            onClick={onSwitchToText}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            Texto simples
          </button>
        </div>
      </div>

      {/* Bottom toolbar — formatting */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        {btn(false, () => editor.chain().focus().undo().run(), <Undo className="size-4" />, 'Desfazer', !editor.can().undo())}
        {btn(false, () => editor.chain().focus().redo().run(), <Redo className="size-4" />, 'Refazer', !editor.can().redo())}

        <div className="mx-1.5 h-4 w-px bg-slate-200" />

        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold className="size-4" />, 'Negrito')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic className="size-4" />, 'Itálico')}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="size-4" />, 'Sublinhado')}
        {btn(editor.isActive('link'), handleSetLink, <LinkIcon className="size-4" />, 'Link')}

        <div className="mx-1.5 h-4 w-px bg-slate-200" />

        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List className="size-4" />, 'Lista com marcadores')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="size-4" />, 'Lista numerada')}

        <div className="mx-1.5 h-4 w-px bg-slate-200" />

        {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), <AlignLeft className="size-4" />, 'Alinhar à esquerda')}
        {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), <AlignCenter className="size-4" />, 'Centralizar')}
        {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), <AlignRight className="size-4" />, 'Alinhar à direita')}

        <div className="mx-1.5 h-4 w-px bg-slate-200" />

        {btn(false, handleInsertTable, <TableIcon className="size-4" />, 'Inserir tabela 3×3')}
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
