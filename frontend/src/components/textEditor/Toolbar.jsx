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
                <button
                    onClick={() => {
                        editor.chain().focus().toggleBold().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleBold()
                            .run()
                    }
                    className={
                        editor.isActive("bold")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                >
                    <Bold className="w-5 h-5" />
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().toggleItalic().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleItalic()
                            .run()
                    }
                    className={
                        editor.isActive("italic")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                >
                    <Italic className="w-5 h-5" />
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().toggleUnderline().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleUnderline()
                            .run()
                    }
                    className={
                        editor.isActive("underline")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                >
                    <Underline className="w-5 h-5" />
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().toggleStrike().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleStrike()
                            .run()
                    }
                    className={
                        editor.isActive("strike")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                >
                    <Strikethrough className="w-5 h-5" />
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().setCode().run();
                    }}
                    disabled={
                        !editor.can()
                          .chain()
                          .focus()
                          .toggleCode()
                          .run()
                      }
                    className={
                        editor.isActive("code")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                >
                    <Code className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().unsetAllMarks().run()}
                    className="bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"
                >
                    Clear marks
                </button>
                <button
                    onClick={() => editor.chain().focus().clearNodes().run()}
                    className="bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"
                >
                    Clear nodes
                </button>
                <button
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    className={editor.isActive('paragraph') ? 'bg-purple-600 text-white px-2 py-1 rounded-lg' : 'bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out'}
                >
                    Paragraph
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={editor.isActive('heading', { level: 1 }) ? 'bg-purple-600 text-white px-2 py-1 rounded-lg' : 'bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out'}
                >
                    H1
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive('heading', { level: 2 }) ? 'bg-purple-600 text-white px-2 py-1 rounded-lg' : 'bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out'}
                >
                    H2
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={editor.isActive('heading', { level: 3 }) ? 'bg-purple-600 text-white px-2 py-1 rounded-lg' : 'bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out'}
                >
                    H3
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                    className={editor.isActive('heading', { level: 4 }) ? 'bg-purple-600 text-white px-2 py-1 rounded-lg' : 'bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out'}
                >
                    H4
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                    className={editor.isActive('heading', { level: 5 }) ? 'bg-purple-600 text-white px-2 py-1 rounded-lg' : 'bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out'}
                >
                    H5
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
                    className={editor.isActive('heading', { level: 6 }) ? 'bg-purple-600 text-white px-2 py-1 rounded-lg' : 'bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out'}
                >
                    H6
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().toggleBulletList().run();
                    }}
                    className={
                        editor.isActive("bulletList")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"
                    }
                >
                    <List className="w-5 h-5" />
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().toggleOrderedList().run();
                    }}
                    className={
                        editor.isActive("orderedList")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"
                    }
                >
                    <ListOrdered className="w-5 h-5" />
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().toggleBlockquote().run();
                    }}
                    className={
                        editor.isActive("blockquote")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"
                    }
                >
                    <Quote className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={editor.isActive('codeBlock')
                        ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                        : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"}
                >
                    Code block
                </button>
                <button
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className="bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"
                >
                    Horizontal rule
                </button>
                <button
                    onClick={() => editor.chain().focus().setHardBreak().run()}
                    className={
                        editor.isActive("bulletList")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"
                    }
                >
                    Hard break
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().undo().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .undo()
                            .run()
                    }
                    className={
                        editor.isActive("undo")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                >
                    <Undo className="w-5 h-5" />
                </button>
                <button
                    onClick={() => {
                        editor.chain().focus().redo().run();
                    }}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .redo()
                            .run()
                    }
                    className={
                        editor.isActive("redo")
                            ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                            : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                >
                    <Redo className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setColor('#958DF1').run()}
                    className={editor.isActive('textStyle', { color: '#958DF1' })
                        ? "bg-purple-600 text-white px-2 py-1 rounded-lg"
                        : "bg-gray-300 px-2 py-1 rounded-lg hover:bg-gray-400 transition duration-100 ease-in-out"}
                >
                    Purple
                </button>
            </div>
        </div>
    );
};

export default Toolbar;