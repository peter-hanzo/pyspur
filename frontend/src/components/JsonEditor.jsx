import React from 'react';

import dynamic from 'next/dynamic';
// Dynamically import JsonEditor with no SSR
const ReactJson = dynamic(() => import('react-json-view'), { ssr: false });


const JsonEditor = ({ jsonValue, onChange }) => {
    const handleJsonChange = (edit) => {
        if (edit.updated_src) {
            onChange(edit.updated_src);
        }
    };

    return (
        <div className="json-editor">
            <label className="font-semibold mb-2 block">JSON Editor</label>
            <ReactJson
                src={jsonValue}
                onEdit={handleJsonChange}
                onAdd={handleJsonChange}
                onDelete={handleJsonChange}
                theme="monokai"
                style={{ padding: '10px', borderRadius: '5px', backgroundColor: '#272822' }}
            />
        </div>
    );
};

export default JsonEditor;
