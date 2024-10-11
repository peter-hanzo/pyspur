import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import ListItem from '@tiptap/extension-list-item';

const Editor = (content, setContent, isEditable) => {
    return useEditor({
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
                class: `flex flex-col px-4 py-3 justify-start border-b border-x border-gray-700 items-start w-full gap-3 font-medium pt-4 rounded-b-md outline-none ${isEditable ? "" : "rounded-md border-t"}`,
            },
        },
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
        editable: isEditable,
        autofocus: 'end',
        immediatelyRender: false,
    });
};

export default Editor;
