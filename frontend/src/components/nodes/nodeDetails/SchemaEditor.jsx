import React, { useState } from 'react';
import { Button, Input } from '@nextui-org/react';

const SchemaEditor = ({ jsonValue = {}, onChange, options = [], disabled = false }) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAddKey = () => {
    if (newKey && !jsonValue?.hasOwnProperty(newKey)) {
      console.log(jsonValue);
      const updatedJson = {
        ...jsonValue,
        [newKey]: newValue || options[0] || '' // Set the first option or empty string as default value
      };
      console.log(updatedJson);
      onChange(updatedJson);
      setNewKey('');
      setNewValue('');
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
      <div className="mb-4 flex items-center">
        <Input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Enter new key"
          className="mr-2 p-1 border rounded"
          disabled={disabled} // Disable when not editing
        />
        <Input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Enter new value"
          className="mr-2 p-1 border rounded"
          disabled={disabled} // Disable when not editing
        />
        <Button
          onClick={handleAddKey}
          color="primary"
          disabled={disabled || !newKey} // Disable when not editing or if no key is entered
          auto
        >
          Add Key
        </Button>
      </div>

      {/* Ensure jsonValue is a valid object before calling Object.entries */}
      {jsonValue && typeof jsonValue === 'object' && !Array.isArray(jsonValue) ? (
        Object.entries(jsonValue).map(([key, value]) => (
          <div key={key} className="mb-2 flex items-center">
            <span className="mr-2">{key}:</span>
            {Array.isArray(options) && options.length > 0 ? (
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
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => handleValueChange(key, e.target.value)}
                className="mr-2 p-1 border rounded"
                disabled={disabled} // Disable when not editing
              />
            )}
            <Button
              onClick={() => handleRemoveKey(key)}
              color="primary"
              disabled={disabled} // Disable when not editing
              auto
            >
              Remove
            </Button>
          </div>
        ))
      ) : (
        <p>No valid JSON data available.</p>
      )}
    </div>
  );
};

export default SchemaEditor;
