"use client";

import React from "react";
import {
    Bold,
    Strikethrough,
    Italic,
    List,
    ListOrdered,
    Underline,
    Quote,
    Undo,
    Redo,
    Code,
} from "lucide-react";
import { Button } from "@nextui-org/react";

const Toolbar = ({ editor }) => {
    if (!editor) {
        return null;
    }
    return (
        <div
            className="px-4 py-3 rounded-tl-md rounded-tr-md flex justify-between items-start
    gap-5 w-full flex-wrap border border-gray-700"
        >
            <div className="flex justify-start items-center gap-3 w-full lg:w-10/12 flex-wrap ">
                <Button
                    onPress={() => {
                        editor.chain().focus().toggleBold().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleBold()
                            .run()
                    }
                    color="primary"
                    variant={editor.isActive("bold") ? "solid" : "flat"}
                    auto
                >
                    <Bold className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().toggleItalic().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleItalic()
                            .run()
                    }
                    color="primary"
                    variant={editor.isActive("italic") ? "solid" : "flat"}
                    auto
                >
                    <Italic className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().toggleUnderline().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleUnderline()
                            .run()
                    }
                    color="primary"
                    variant={editor.isActive("underline") ? "solid" : "flat"}
                    auto
                >
                    <Underline className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().toggleStrike().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleStrike()
                            .run()
                    }
                    color="primary"
                    variant={editor.isActive("strike") ? "solid" : "flat"}
                    auto
                >
                    <Strikethrough className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().setCode().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleCode()
                            .run()
                    }
                    color="primary"
                    variant={editor.isActive("code") ? "solid" : "flat"}
                    auto
                >
                    <Code className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => editor.chain().focus().unsetAllMarks().run()}
                    color="primary"
                    variant="flat"
                    auto
                >
                    Clear marks
                </Button>
                <Button
                    onPress={() => editor.chain().focus().clearNodes().run()}
                    color="primary"
                    variant="flat"
                    auto
                >
                    Clear nodes
                </Button>
                <Button
                    onPress={() => editor.chain().focus().setParagraph().run()}
                    color="primary"
                    variant={editor.isActive('paragraph') ? "solid" : "flat"}
                    auto
                >
                    Paragraph
                </Button>
                <Button
                    onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    color="primary"
                    variant={editor.isActive('heading', { level: 1 }) ? "solid" : "flat"}
                    auto
                >
                    H1
                </Button>
                <Button
                    onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    color="primary"
                    variant={editor.isActive('heading', { level: 2 }) ? "solid" : "flat"}
                    auto
                >
                    H2
                </Button>
                <Button
                    onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    color="primary"
                    variant={editor.isActive('heading', { level: 3 }) ? "solid" : "flat"}
                    auto
                >
                    H3
                </Button>
                <Button
                    onPress={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                    color="primary"
                    variant={editor.isActive('heading', { level: 4 }) ? "solid" : "flat"}
                    auto
                >
                    H4
                </Button>
                <Button
                    onPress={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                    color="primary"
                    variant={editor.isActive('heading', { level: 5 }) ? "solid" : "flat"}
                    auto
                >
                    H5
                </Button>
                <Button
                    onPress={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
                    color="primary"
                    variant={editor.isActive('heading', { level: 6 }) ? "solid" : "flat"}
                    auto
                >
                    H6
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().toggleBulletList().run();
                    }}
                    color="primary"
                    variant={editor.isActive("bulletList") ? "solid" : "flat"}
                    auto
                >
                    <List className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().toggleOrderedList().run();
                    }}
                    color="primary"
                    variant={editor.isActive("orderedList") ? "solid" : "flat"}
                    auto
                >
                    <ListOrdered className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().toggleBlockquote().run();
                    }}
                    color="primary"
                    variant={editor.isActive("blockquote") ? "solid" : "flat"}
                    auto
                >
                    <Quote className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => editor.chain().focus().toggleCodeBlock().run()}
                    color="primary"
                    variant={editor.isActive('codeBlock') ? "solid" : "flat"}
                    auto
                >
                    Code block
                </Button>
                <Button
                    onPress={() => editor.chain().focus().setHorizontalRule().run()}
                    color="primary"
                    variant="flat"
                    auto
                >
                    Horizontal rule
                </Button>
                <Button
                    onPress={() => editor.chain().focus().setHardBreak().run()}
                    color="primary"
                    variant="flat"
                    auto
                >
                    Hard break
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().undo().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .undo()
                            .run()
                    }
                    color="primary"
                    variant="flat"
                    auto
                >
                    <Undo className="w-5 h-5" />
                </Button>
                <Button
                    onPress={() => {
                        editor.chain().focus().redo().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .redo()
                            .run()
                    }
                    color="primary"
                    variant="flat"
                    auto
                >
                    <Redo className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

export default Toolbar;
