"use client";

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
  });

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Merged Toolbar component logic
  const renderToolbar = () => {
    if (!editor) return null;

    // Add size classes based on fullScreen prop
    const buttonSize = fullScreen ? "sm" : "md";
    const buttonClassName = fullScreen ? "w-4 h-4" : "w-3 h-3";
    const toolbarClassName = fullScreen
      ? "px-2 py-2 rounded-t-medium flex justify-between items-start gap-1 w-full flex-wrap bg-content2 border-b border-divider"
      : "px-2 py-2 rounded-t-medium flex justify-between items-start gap-1 w-full flex-wrap bg-content2 border-b border-divider";

    return (
      <div className={toolbarClassName}>
        <div className="flex justify-start items-center gap-1 w-full lg:w-10/12 flex-wrap">
          <Button
            onPress={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            color="primary"
            variant={editor.isActive("bold") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <Bold className={buttonClassName} />
          </Button>
          <Button
            onPress={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            color="primary"
            variant={editor.isActive("italic") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <Italic className={buttonClassName} />
          </Button>
          <Button
            onPress={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            color="primary"
            variant={editor.isActive("strike") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <Strikethrough className={buttonClassName} />
          </Button>
          <Button
            onPress={() => editor.chain().focus().toggleBulletList().run()}
            color="primary"
            variant={editor.isActive("bulletList") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <List className={buttonClassName} />
          </Button>
          <Button
            onPress={() => editor.chain().focus().toggleOrderedList().run()}
            color="primary"
            variant={editor.isActive("orderedList") ? "solid" : "flat"}
            size={buttonSize}
            auto
            isIconOnly
          >
            <ListOrdered className={buttonClassName} />
          </Button>
          {fullScreen && (
            <>
              <Button
                onPress={() => editor.chain().focus().setParagraph().run()}
                color="primary"
                variant={editor.isActive('paragraph') ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                P
              </Button>
              <Button
                onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                color="primary"
                variant={editor.isActive('heading', { level: 1 }) ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                H1
              </Button>
              <Button
                onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                color="primary"
                variant={editor.isActive('heading', { level: 2 }) ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                H2
              </Button>
              <Button
                onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                color="primary"
                variant={editor.isActive('heading', { level: 3 }) ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                H3
              </Button>
              <Button
                onPress={() => editor.chain().focus().toggleBlockquote().run()}
                color="primary"
                variant={editor.isActive("blockquote") ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                <Quote className={buttonClassName} />
              </Button>
              <Button
                onPress={() => editor.chain().focus().toggleCodeBlock().run()}
                color="primary"
                variant={editor.isActive('codeBlock') ? "solid" : "flat"}
                size={buttonSize}
                auto
                isIconOnly
              >
                <Code className={buttonClassName} />
              </Button>
              <Button
                onPress={() => editor.chain().focus().setHorizontalRule().run()}
                color="primary"
                variant="flat"
                size={buttonSize}
                auto
                isIconOnly
              >
                <SeparatorHorizontal className={buttonClassName} />
              </Button>
              <Button
                onPress={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                color="primary"
                variant="flat"
                size={buttonSize}
                auto
                isIconOnly
              >
                <Undo className={buttonClassName} />
              </Button>
              <Button
                onPress={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
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

  return (
    <div>
      {isEditable && renderToolbar()}
      <div className={styles.tiptap}>
        <EditorContent editor={editor} />
      </div>

      {/* Button to open full-screen modal */}
      <Button onPress={onOpen} className="mt-4">Open Full-Screen Editor</Button>

      {/* Full-Screen Modal using NextUI */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent
          className="w-[75vw] h-[75vh] flex items-center justify-center"
        >
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Full-Screen Editor</ModalHeader>
              <ModalBody>
                <TextEditor content={content} setContent={setContent} isEditable={isEditable} fullScreen={true} />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TextEditor;