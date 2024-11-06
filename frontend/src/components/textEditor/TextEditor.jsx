"use client";

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import ListItem from "@tiptap/extension-list-item";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from "@nextui-org/react";
import {
  Bold, Strikethrough, Italic, List, ListOrdered, Quote, Undo, Redo, Code, SeparatorHorizontal
} from "lucide-react";
import styles from "./TextEditor.module.css";
import { Icon } from "@iconify/react";

// Wrap the component with forwardRef
const TextEditor = forwardRef(({ content, setContent, isEditable, fullScreen }, ref) => {
  const editor = useEditor({
    extensions: [
      Color.configure({ types: [TextStyle.name, ListItem.name] }),
      TextStyle.configure({ types: [ListItem.name] }),
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
    ],
    content: content,
    editorProps: {
      attributes: {
        class: `w-full bg-content2 hover:bg-content3 transition-colors min-h-[40px] resize-y rounded-medium px-3 py-2 text-foreground outline-none placeholder:text-foreground-500 ${isEditable ? "" : "rounded-medium"} ${fullScreen ? styles.fullScreenEditor : ""}`,
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    editable: isEditable,
    autofocus: 'end',
    immediatelyRender: false,
    parseOptions: {
      preserveWhitespace: 'full',
    },
  });

  // Expose the insertAtCursor method to the parent component via ref
  useImperativeHandle(ref, () => ({
    insertAtCursor: (text) => {
      if (editor) {
        editor.chain().focus().insertContent(text).run();
      }
    },
  }));

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const modalEditor = useEditor({
    extensions: [
      Color.configure({ types: [TextStyle.name, ListItem.name] }),
      TextStyle.configure({ types: [ListItem.name] }),
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: `w-full bg-content2 hover:bg-content3 transition-colors min-h-[40vh] resize-y rounded-medium px-3 py-2 text-foreground outline-none placeholder:text-foreground-500`,
      },
    },
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      if (newContent !== content) {
        setContent(newContent);
      }
    },
    editable: true,
    autofocus: false,
    immediatelyRender: false,
    parseOptions: {
      preserveWhitespace: 'full',
    },
  });

  React.useEffect(() => {
    if (modalEditor && content !== modalEditor.getHTML()) {
      modalEditor.commands.setContent(content || '');
    }
  }, [content, modalEditor]);

  React.useEffect(() => {
    return () => {
      if (modalEditor) {
        modalEditor.destroy();
      }
    };
  }, [modalEditor]);

  const ModalEditor = () => {
    return (
      <div>
        {renderToolbar(modalEditor, true)}
        <div className={styles.tiptap}>
          <EditorContent editor={modalEditor} />
        </div>
      </div>
    );
  };

  // Modified renderToolbar to accept editor instance and fullScreen flag
  const renderToolbar = (editorInstance, isFullScreen = false) => {
    if (!editorInstance) return null;

    const buttonSize = isFullScreen ? "sm" : "md";
    const buttonClassName = isFullScreen ? "w-4 h-4" : "w-3 h-3";
    const toolbarClassName = `px-2 py-2 rounded-t-medium flex justify-between items-start gap-1 w-full flex-wrap bg-content2 border-b border-divider`;

    return (
      <div className={toolbarClassName}>
        <div className="flex justify-start items-center gap-1 w-full lg:w-10/12 flex-wrap">
          <Button
            onPress={() => editorInstance.chain().focus().toggleBold().run()}
            disabled={!editorInstance.can().chain().focus().toggleBold().run()}
            color="primary"
            variant={editorInstance.isActive("bold") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <Bold className={buttonClassName} />
          </Button>
          <Button
            onPress={() => editorInstance.chain().focus().toggleItalic().run()}
            disabled={!editorInstance.can().chain().focus().toggleItalic().run()}
            color="primary"
            variant={editorInstance.isActive("italic") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <Italic className={buttonClassName} />
          </Button>
          <Button
            onPress={() => editorInstance.chain().focus().toggleStrike().run()}
            disabled={!editorInstance.can().chain().focus().toggleStrike().run()}
            color="primary"
            variant={editorInstance.isActive("strike") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <Strikethrough className={buttonClassName} />
          </Button>
          <Button
            onPress={() => editorInstance.chain().focus().toggleBulletList().run()}
            color="primary"
            variant={editorInstance.isActive("bulletList") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <List className={buttonClassName} />
          </Button>
          <Button
            onPress={() => editorInstance.chain().focus().toggleOrderedList().run()}
            color="primary"
            variant={editorInstance.isActive("orderedList") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <ListOrdered className={buttonClassName} />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {isEditable && renderToolbar(editor)}
      <div className={styles.tiptap}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

export default TextEditor;