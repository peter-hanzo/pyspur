import React, { useState } from 'react';
import { Button } from '@nextui-org/react';
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
        <Button
          onClick={handleAddKey}
          color="primary"
          disabled={disabled} // Disable when not editing
          auto
        >
          Add Key
        </Button>
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
          <Button
            onClick={() => handleRemoveKey(key)}
            color="primary"
            disabled={disabled} // Disable when not editing
            auto
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
};

export default JsonEditor;
