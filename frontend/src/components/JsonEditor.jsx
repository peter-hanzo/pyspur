import React, { useState } from 'react';

const JsonEditor = ({ jsonValue = {}, onChange, options }) => {
  const [newKey, setNewKey] = useState('');

  const handleAddKey = () => {
    if (newKey && !jsonValue.hasOwnProperty(newKey)) {
      const updatedJson = {
        ...jsonValue,
        [newKey]: options[0] // Set the first option as default value
      };
      onChange(updatedJson);
      setNewKey('');
    }
  };

  const handleValueChange = (key, value) => {
    const updatedJson = {
      ...jsonValue,
      [key]: value
    };
    onChange(updatedJson);
  };

  const handleRemoveKey = (key) => {
    const { [key]: _, ...updatedJson } = jsonValue;
    onChange(updatedJson);
  };

  return (
    <div className="json-editor">
      <label className="font-semibold mb-2 block">JSON Editor</label>
      <div className="mb-4">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Enter new key"
          className="mr-2 p-2 border rounded"
        />
        <button
          onClick={handleAddKey}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Key
        </button>
      </div>
      {Object.entries(jsonValue).map(([key, value]) => (
        <div key={key} className="mb-2 flex items-center">
          <span className="mr-2">{key}:</span>
          <select
            value={value}
            onChange={(e) => handleValueChange(key, e.target.value)}
            className="mr-2 p-2 border rounded"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleRemoveKey(key)}
            className="bg-red-500 text-white px-2 py-1 rounded"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
};

export default JsonEditor;
