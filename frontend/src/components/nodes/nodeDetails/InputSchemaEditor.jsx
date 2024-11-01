import React, { useState } from 'react';
import { Button, Input, Textarea, Tooltip } from '@nextui-org/react';
import { Icon } from '@iconify/react';

const InputSchemaEditor = ({ jsonValue = {}, onChange, disabled = false }) => {
  const [newKey, setNewKey] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editedKey, setEditedKey] = useState('');

  const handleAddKey = () => {
    if (newKey && !jsonValue?.hasOwnProperty(newKey)) {
      const updatedJson = {
        ...jsonValue,
        [newKey]: true
      };
      onChange(updatedJson);
      setNewKey('');
    }
  };

  const handleRemoveKey = (key) => {
    const { [key]: _, ...updatedJson } = jsonValue;
    onChange(updatedJson);
  };

  const handleEditKey = (key) => {
    setEditingKey(key);
    setEditedKey(key);
  };

  const handleSaveEditedKey = (oldKey) => {
    if (editedKey && editedKey !== oldKey && !jsonValue.hasOwnProperty(editedKey)) {
      const { [oldKey]: _, ...updatedJson } = jsonValue;
      updatedJson[editedKey] = true;
      onChange(updatedJson);
    }
    setEditingKey(null);
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
          disabled={disabled}
        />
        <Button
          onClick={handleAddKey}
          color="primary"
          disabled={disabled || !newKey}
          auto
        >
          Add Key
        </Button>
      </div>

      {jsonValue && typeof jsonValue === 'object' && !Array.isArray(jsonValue) && (
        <div className="flex flex-wrap">
          {Object.keys(jsonValue).map((key) => (
            <div key={key} className="mb-2 flex items-center mr-4">
              {editingKey === key ? (
                <Textarea
                  value={editedKey}
                  onChange={(e) => setEditedKey(e.target.value)}
                  className="mr-2 p-1 border rounded"
                  disabled={disabled}
                  autoFocus
                />
              ) : (
                <Tooltip
                  content={
                    <Button
                      onClick={() => handleRemoveKey(key)}
                      color="transparent"
                      disabled={disabled}
                      auto
                    >
                      <Icon icon="solar:trash-bin-minimalistic-linear" width={20} />
                    </Button>
                  }
                >
                  <span
                    className="mr-2 p-1 border rounded bg-gray-200 cursor-pointer"
                    onClick={() => handleEditKey(key)}
                  >
                    {key}
                  </span>
                </Tooltip>
              )}
              {editingKey === key && (
                <Button
                  onClick={() => handleSaveEditedKey(key)}
                  color="primary"
                  disabled={disabled || !editedKey}
                  auto
                >
                  Save
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InputSchemaEditor;
