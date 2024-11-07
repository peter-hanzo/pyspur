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
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Enter new key"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && newKey) {
              handleAddKey();
            }
          }}
        />
        <Button
          isIconOnly
          radius="full"
          variant="light"
          onClick={handleAddKey}
          color="primary"
          disabled={disabled || !newKey}
        >
          <Icon icon="solar:add-circle-linear" width={22} />
        </Button>
      </div>

      {jsonValue && typeof jsonValue === 'object' && !Array.isArray(jsonValue) && (
        <div className="flex flex-wrap gap-2">
          {Object.keys(jsonValue).map((key) => (
            <div key={key} className="flex items-center">
              {editingKey === key ? (
                <>
                  <Input
                    size="sm"
                    value={editedKey}
                    onChange={(e) => setEditedKey(e.target.value)}
                    disabled={disabled}
                    autoFocus
                  />
                  <Button
                    isIconOnly
                    radius="full"
                    variant="light"
                    onClick={() => handleSaveEditedKey(key)}
                    color="primary"
                    disabled={disabled || !editedKey}
                    className="ml-2"
                  >
                    <Icon icon="solar:check-circle-linear" width={22} />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="p-1 px-2 border rounded bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleEditKey(key)}
                  >
                    {key}
                  </span>
                  <Button
                    isIconOnly
                    radius="full"
                    variant="light"
                    onClick={() => handleRemoveKey(key)}
                    color="danger"
                    disabled={disabled}
                  >
                    <Icon icon="solar:trash-bin-minimalistic-linear" width={20} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InputSchemaEditor;
