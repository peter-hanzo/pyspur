import React, { useState } from 'react';
import { EditorContent, EditorRoot } from "novel";


function TextEditor() {
  const [content, setContent] = useState(null);

  return (
    <EditorRoot>
      <EditorContent
        initialContent={content}
        immediatelyRender={false} // {{ edit_1 }}
        onUpdate={({ editor }) => {
          const json = editor.getJSON();
          setContent(json);
        }}
      />
    </EditorRoot>
  );
}

export default TextEditor;