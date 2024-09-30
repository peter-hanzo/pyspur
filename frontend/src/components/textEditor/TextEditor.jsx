"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Toolbar from "./Toolbar";
import Underline from "@tiptap/extension-underline";
import styles from "./TextEditor.module.css";
import { Color } from '@tiptap/extension-color'
import TextStyle from "@tiptap/extension-text-style";


const TextEditor = ({ content, onChange = () => { } }) => {

  const handleChange = (newContent) => {
    onChange(newContent);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color
    ],
    content: content,
    editorProps: {
      attributes: {
        class:
          "flex flex-col px-4 py-3 justify-start border-b border-r border-l border-gray-700 items-start w-full gap-3 font-medium pt-4 rounded-bl-md rounded-br-md outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      handleChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  return (
    <div className="w-full px-4 py-10 my-10">
      <Toolbar editor={editor} content={content} />
      <div className={styles.tiptap}>
        <EditorContent style={{ whiteSpace: "pre-line" }} editor={editor} />
      </div>
    </div>
  );
};

export default TextEditor;