import React, { useState } from 'react';
import { Button, Input, Select, SelectItem } from '@nextui-org/react';
import { Icon } from '@iconify/react';

const InputSchemaEditor = ({ jsonValue = {}, onChange, options = [], disabled = false }) => {
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('str'); // Default to 'string'

  const handleAddKey = () => {
    if (newKey && !jsonValue?.hasOwnProperty(newKey)) {
      const updatedJson = {
        ...jsonValue,
        [newKey]: newType // Store the selected type instead of a value
      };
      onChange(updatedJson);
      setNewKey('');
      setNewType('str'); // Reset to default type
    }
  };

  const handleTypeChange = (key, type) => {
    const updatedJson = {
      ...jsonValue,
      [key]: type
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
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && newKey) {
              handleAddKey();
            }
          }}
        />
        <Select
          selectedValue={newType}
          onChange={(e) => setNewType(e.target.value)}
          disabled={disabled}
          label="Select Type"
          defaultSelectedKeys={["str"]}
          className="max-w-xs"
        >
          <SelectItem key="str" value="str">str</SelectItem>
          <SelectItem key="bool" value="bool">bool</SelectItem>
          <SelectItem key="int" value="int">int</SelectItem>
          <SelectItem key="float" value="float">float</SelectItem>
        </Select>
        <Button
          isIconOnly
          radius="full"
          variant="light"
          onClick={handleAddKey}
          color="primary"
          disabled={disabled || !newKey}
          auto
        >
          <Icon icon="solar:add-circle-linear" width={22} />
        </Button>
      </div>

      {jsonValue && typeof jsonValue === 'object' && !Array.isArray(jsonValue) && (
        Object.entries(jsonValue).map(([key, type]) => (
          <div key={key} className="mb-2 flex items-center">
            <span className="mr-2">{key}:</span>
            <span className="mr-2 p-1 border rounded bg-gray-200">{type}</span>
            <Button
              isIconOnly
              radius="full"
              variant="light"
              onClick={() => handleRemoveKey(key)}
              color="primary"
              disabled={disabled}
              auto
            >
              <Icon icon="solar:minus-circle-linear" width={22} />
            </Button>
          </div>
        ))
      )}
    </div>
  );
};

export default InputSchemaEditor;
