import React, { useState } from 'react';

const JsonEditor = ({ jsonValue = {}, onChange, options, disabled }) => {
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
      <div className="mb-4">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Enter new key"
          className="mr-2 p-1 border rounded"
          disabled={disabled} // Disable when not editing
        />
        <button
          onClick={handleAddKey}
          className="bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50 disabled:bg-gray-400"
          disabled={disabled} // Disable when not editing
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
            disabled={disabled} // Disable when not editing
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
            disabled={disabled} // Disable when not editing
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
};

export default JsonEditor;
