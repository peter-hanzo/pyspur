import React, { useState } from 'react';
import { Button, Input, Select, SelectItem } from '@nextui-org/react';
import { Icon } from '@iconify/react';

const SchemaEditor = ({ jsonValue = {}, onChange, options = [], disabled = false, schemaType = 'input' }) => {
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('str'); // Default to 'string'
  const [editingKey, setEditingKey] = useState(null); // Track which key's type is being edited

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
      <div className="mb-4 flex items-center space-x-4">
        <Input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder={`${schemaType} text`}
          label={`${schemaType} key name`}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && newKey) {
              handleAddKey();
            }
          }}
          className="p-2 flex-grow w-2/3"
        />
        <Select
          selectedValue={newType}
          onChange={(e) => setNewType(e.target.value)}
          disabled={disabled}
          label="Select Type"
          defaultSelectedKeys={["str"]}
          className="max-w-xs p-2 w-1/3"
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
            {editingKey === key ? (
              <Select
                selectedValue={type}
                onChange={(e) => {
                  handleTypeChange(key, e.target.value);
                  setEditingKey(null); // Close the dropdown after selection
                }}
                disabled={disabled}
                defaultSelectedKeys={[type]}
              >
                <SelectItem key="str" value="str">str</SelectItem>
                <SelectItem key="bool" value="bool">bool</SelectItem>
                <SelectItem key="int" value="int">int</SelectItem>
                <SelectItem key="float" value="float">float</SelectItem>
              </Select>
            ) : (
              <span
                className="mr-2 p-1 border rounded bg-gray-200 cursor-pointer"
                onClick={() => setEditingKey(key)} // Open the dropdown on click
              >
                {type}
              </span>
            )}
            <Button
              isIconOnly
              radius="full"
              variant="light"
              onClick={() => handleRemoveKey(key)}
              color="primary"
              disabled={disabled}
              auto
            >
              <Icon icon="solar:trash-bin-trash-linear" width={22} />
            </Button>
          </div>
        ))
      )}
    </div>
  );
};

export default SchemaEditor;