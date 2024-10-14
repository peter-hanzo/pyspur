"use client";

import Toolbar from "./Toolbar";
import styles from "./Editor.module.css";
import { EditorContent } from "@tiptap/react";

const TextEditor = ({ editor, isEditable }) => {
    return (
        <div>
            {isEditable && <Toolbar editor={editor} />}
            <div className={styles.tiptap}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

export default TextEditor;