"use client";

import React, { useEffect, useState } from "react";
import Toolbar from "./Toolbar";
import Editor from "./Editor";
import styles from "./TextEditor.module.css";
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