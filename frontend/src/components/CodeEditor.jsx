import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

const CodeEditor = ({ code, onChange }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (typeof code === 'string') {
      setValue(code);
    }
  }, [code]);

  const handleEditorChange = (newValue) => {
    setValue(newValue); // CodeMirror 6 provides the updated value directly
    onChange(newValue); // Call the parent's onChange handler with the new value
  };

  return (
    <div className="code-editor">
      <label className="font-semibold mb-2 block">Code Editor</label>
      <CodeMirror
        value={value}
        height="200px"
        theme={oneDark}
        extensions={[python()]}
        onChange={handleEditorChange} // No need to pass the editor instance
        className="border"
      />
    </div>
  );
};

export default CodeEditor;
