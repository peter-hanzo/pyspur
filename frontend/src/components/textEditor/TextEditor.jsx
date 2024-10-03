"use client";

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useSelector, useDispatch } from "react-redux";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import ListItem from "@tiptap/extension-list-item";
import Toolbar from "./Toolbar"; // Ensure Toolbar is correctly imported
import { updateNodeData } from "../../store/flowSlice"; // Action for updating node data
import styles from "./TextEditor.module.css";

const TextEditor = ({ nodeID }) => {
  const dispatch = useDispatch();
  const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID)); // Find the node by ID
  const [content, setContent] = useState(node?.data?.prompt || ""); // Local state for the content

  // Handle content change and auto-save to Redux store
  const handleContentChange = (input) => {
    setContent(input); // Update local content state
    dispatch(updateNodeData({ id: nodeID, data: { prompt: input } })); // Dispatch updated node data
  };

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
        class:
          "flex flex-col px-4 py-3 justify-start border-b border-r border-l border-gray-700 items-start w-full gap-3 font-medium pt-4 rounded-bl-md rounded-br-md outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      handleContentChange(editor.getHTML()); // Auto-save content on update
    },
    immediatelyRender: false,
  });

  // Update editor content whenever `nodeID` or `initialContent` changes
  useEffect(() => {
    if (editor && node?.data?.prompt !== editor.getHTML()) {
      setContent(node?.data?.prompt || ""); // Set new initial content
      editor.commands.setContent(node?.data?.prompt || ""); // Update the editor content
    }
  }, [nodeID, node?.data?.prompt, editor]);

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
