import React, { useState } from 'react';
import { Button, Input, Select, SelectItem } from '@nextui-org/react';
import { Icon } from '@iconify/react';

const SchemaEditor = ({ jsonValue = {}, onChange, options = [], disabled = false, schemaType = 'input' }) => {
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('str'); // Default to 'string'
  const [editingKey, setEditingKey] = useState(null); // Track which key's type is being edited
  const [editingField, setEditingField] = useState(null); // Track the field being edited

  const handleAddKey = () => {
    if (newKey && !jsonValue?.hasOwnProperty(newKey)) {
      const updatedJson = {
        ...jsonValue,
        [newKey]: {
          title: newKey,
          type: newType
        }
      };
      onChange(updatedJson);
      setNewKey('');
      setNewType('str');
    }
  };

  const handleTypeChange = (key, type) => {
    const updatedJson = {
      ...jsonValue,
      [key]: {
        title: key,
        type: type
      }
    };
    onChange(updatedJson);
  };

  const handleRemoveKey = (key) => {
    const { [key]: _, ...updatedJson } = jsonValue;
    onChange(updatedJson);
  };

  // Helper function to extract the type from the value
  const getType = (value) => {
    if (typeof value === 'object' && value !== null) {
      return value.type || 'str';
    }
    return value;
  };

  const handleKeyEdit = (oldKey, newKey) => {
    if (oldKey === newKey || !newKey.trim()) {
      setEditingField(null);
      return;
    }

    const updatedJson = {
      ...jsonValue,
      [newKey]: {
        title: newKey,
        type: jsonValue[oldKey].type
      }
    };
    delete updatedJson[oldKey];

    onChange(updatedJson);
    setEditingField(null);
  };

  return (
    <div className="json-editor">
      <div className="mb-4 flex items-center space-x-4">
        <Input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder={`${schemaType} key name`}
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
        Object.entries(jsonValue).map(([key, value]) => (
          <div key={key} className="mb-2 flex items-center">
            {editingField === key ? (
              <Input
                autoFocus
                defaultValue={key}
                size="sm"
                variant="faded"
                radius="lg"
                onBlur={(e) => handleKeyEdit(key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleKeyEdit(key, e.target.value);
                  } else if (e.key === 'Escape') {
                    setEditingField(null);
                  }
                }}
                classNames={{
                  input: "bg-default-100",
                  inputWrapper: "shadow-none",
                }}
              />
            ) : (
              <span
                className="mr-2 p-1 border rounded bg-gray-200 cursor-pointer"
                onClick={() => setEditingField(key)} // Open the input on click
              >
                {key}
              </span>
            )}
            <span className="mr-2">{getType(value)}</span>
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