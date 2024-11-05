"use client";

import React from 'react';
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

const TextEditor = ({ content, setContent, isEditable, fullScreen }) => {
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
          {isFullScreen && (
            <>
              <Button
                onPress={() => editorInstance.chain().focus().setParagraph().run()}
                color="primary"
                variant={editorInstance.isActive('paragraph') ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                P
              </Button>
              <Button
                onPress={() => editorInstance.chain().focus().toggleHeading({ level: 1 }).run()}
                color="primary"
                variant={editorInstance.isActive('heading', { level: 1 }) ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                H1
              </Button>
              <Button
                onPress={() => editorInstance.chain().focus().toggleHeading({ level: 2 }).run()}
                color="primary"
                variant={editorInstance.isActive('heading', { level: 2 }) ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                H2
              </Button>
              <Button
                onPress={() => editorInstance.chain().focus().toggleHeading({ level: 3 }).run()}
                color="primary"
                variant={editorInstance.isActive('heading', { level: 3 }) ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                H3
              </Button>
              <Button
                onPress={() => editorInstance.chain().focus().toggleBlockquote().run()}
                color="primary"
                variant={editorInstance.isActive("blockquote") ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                <Quote className={buttonClassName} />
              </Button>
              <Button
                onPress={() => editorInstance.chain().focus().toggleCodeBlock().run()}
                color="primary"
                variant={editorInstance.isActive('codeBlock') ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                <Code className={buttonClassName} />
              </Button>
              <Button
                onPress={() => editorInstance.chain().focus().setHorizontalRule().run()}
                color="primary"
                variant="flat"
                size={buttonSize}
                auto
                isIconOnly
              >
                <SeparatorHorizontal className={buttonClassName} />
              </Button>
              <Button
                onPress={() => editorInstance.chain().focus().undo().run()}
                disabled={!editorInstance.can().chain().focus().undo().run()}
                color="primary"
                variant="flat"
                size={buttonSize}
                auto
                isIconOnly
              >
                <Undo className={buttonClassName} />
              </Button>
              <Button
                onPress={() => editorInstance.chain().focus().redo().run()}
                disabled={!editorInstance.can().chain().focus().redo().run()}
                color="primary"
                variant="flat"
                size={buttonSize}
                auto
                isIconOnly
              >
                <Redo className={buttonClassName} />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Add this new function to handle cancellation
  const handleCancel = (onClose) => {
    modalEditor.commands.setContent(content || '');
    onClose();
  };

  // Add this function to handle saving
  const handleSave = (onClose) => {
    setContent(modalEditor.getHTML());
    onClose();
  };

  return (
    <div>
      {isEditable && renderToolbar(editor)}
      <div className={styles.tiptap}>
        <EditorContent editor={editor} />
      </div>

      {!fullScreen && (
        <>
          <Button onPress={onOpen} className="mt-4">Open Full-Screen Editor</Button>

          <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="5xl"
            scrollBehavior="inside"
            placement="center"
          >
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">Prompt Editor</ModalHeader>
                  <ModalBody>
                    <div>
                      {renderToolbar(modalEditor, true)}
                      <div className={styles.tiptap}>
                        <EditorContent editor={modalEditor} />
                      </div>
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="danger" variant="light" onPress={() => handleCancel(onClose)}>
                      Cancel
                    </Button>
                    <Button color="primary" onPress={() => handleSave(onClose)}>
                      Save
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </>
      )}
    </div>
  );
};

export default TextEditor;