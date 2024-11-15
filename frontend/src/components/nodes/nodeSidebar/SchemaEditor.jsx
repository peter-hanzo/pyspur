import React, { useState } from 'react';
import { Button, Input, Select, SelectItem } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import useNode from '../../../hooks/useNode';

const SchemaEditor = (props) => {
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('str'); // Default to 'string'
  const [editingField, setEditingField] = useState(null); // Track the field being edited
  const { nodeID, schemaType, disabled = false } = props;
  const {input_schema, output_schema, addSchemaField, deleteSchemaField, updateSchemaField} = useNode(nodeID);

  if (!nodeID) return null;
  
  const schemaFields = schemaType === 'input' ? input_schema : output_schema;

  const handleAddKey = () => {
    addSchemaField(newKey, newType, schemaType);
    setNewKey('');
    setNewType('str');
  };

  const handleTypeChange = (key, type) => {
    updateSchemaField(key, key, type, schemaType);
  };

  const handleRemoveKey = (key) => {
    deleteSchemaField(key, schemaType);
  };

  const handleKeyEdit = (oldKey, newKey) => {
    if (oldKey === newKey || !newKey.trim()) {
      setEditingField(null);
      return;
    }
    updateSchemaField(oldKey, newKey, null, schemaType);
    setEditingField(null);
  };
  
  return (
    <div className="json-editor">
      <div className="mb-4 flex items-center">
        <Input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder={`${schemaType} field name`}
          // label={`${schemaType} field name`}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && newKey) {
              handleAddKey();
            }
          }}
          className="flex-grow w-2/3"
        />
        <Select
          selectedValue={newType}
          onChange={(e) => setNewType(e.target.value)}
          disabled={disabled}
          aria-labelledby="Type"
          // label="Type"
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

      {schemaFields && Array.isArray(schemaFields) && (
        schemaFields.map((schemaField) => (
          schemaField && (
            <div key={schemaField.field_name} className="mb-2 flex items-center">
              {editingField === schemaField.field_name ? (
                <Input
                  autoFocus
                  defaultValue={schemaField.field_name}
                  size="sm"
                  variant="faded"
                  radius="lg"
                  onBlur={(e) => handleKeyEdit(schemaField.field_name, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleKeyEdit(schemaField.field_name, e.target.value);
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
                  onClick={() => setEditingField(schemaField.field_name)} // Open the input on click
                >
                  {schemaField.field_name}
                </span>
              )}
              <span className="mr-2">{schemaField.field_type}</span>
              <Button
                isIconOnly
                radius="full"
                variant="light"
                onClick={() => handleRemoveKey(schemaField.field_name)}
                color="primary"
                disabled={disabled}
                auto
              >
                <Icon icon="solar:trash-bin-trash-linear" width={22} />
              </Button>
            </div>
          )
        ))
      )}
    </div>
  );
};

export default SchemaEditor;