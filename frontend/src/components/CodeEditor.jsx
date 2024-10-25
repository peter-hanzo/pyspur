import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

const CodeEditor = ({ code, onChange, disabled }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (typeof code === 'string') {
      setValue(code);
    }
  }, [code]);

  const handleEditorChange = (newValue) => {
    setValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="code-editor">
      <label className="text-sm font-semibold mb-2 block">Code Editor</label>
      <CodeMirror
        value={value}
        height="200px"
        theme={oneDark}
        extensions={[python()]}
        onChange={handleEditorChange}
        className="border"
        editable={!disabled} // Disable editing when not in editing mode
      />
    </div>
  );
};

export default CodeEditor;
