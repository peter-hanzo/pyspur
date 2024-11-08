import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
} from "@nextui-org/react";
import { Icon } from "@iconify/react";

const DebugModal = ({ isOpen, onOpenChange }) => {
  // Get input nodes and their schemas from Redux state
  const nodes = useSelector(state => state.flow.nodes);
  const inputNodes = nodes.filter(node => node.type === 'input');

  // Get all unique input fields from all input nodes
  const inputFields = inputNodes.reduce((fields, node) => {
    const schema = node.data?.userconfig?.input_schema || {};
    Object.keys(schema).forEach(key => {
      if (!fields.includes(key)) {
        fields.push(key);
      }
    });
    return fields;
  }, []);

  // Initialize test data with dynamic columns based on input fields
  const [testData, setTestData] = useState([
    { id: 1, name: "Test Case 1", ...inputFields.reduce((acc, field) => ({ ...acc, [field]: "" }), {}) },
    { id: 2, name: "Test Case 2", ...inputFields.reduce((acc, field) => ({ ...acc, [field]: "" }), {}) },
  ]);

  // Initialize new row with dynamic fields
  const [newRow, setNewRow] = useState({
    name: "",
    ...inputFields.reduce((acc, field) => ({ ...acc, [field]: "" }), {}),
  });

  const [editingCell, setEditingCell] = useState(null);

  const handleAddRow = () => {
    if (newRow.name && Object.values(newRow).every(value => value !== "")) {
      setTestData([
        ...testData,
        {
          id: testData.length + 1,
          ...newRow
        }
      ]);
      setNewRow({ name: "", ...inputFields.reduce((acc, field) => ({ ...acc, [field]: "" }), {}) });
    }
  };

  const handleDeleteRow = (id) => {
    setTestData(testData.filter(row => row.id !== id));
  };

  const handleDoubleClick = (rowId, field) => {
    setEditingCell({ rowId, field });
  };

  const handleCellEdit = (rowId, field, value) => {
    setTestData(testData.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  const handleBlur = () => {
    setEditingCell(null);
  };

  const renderCell = (row, field) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <Input
          autoFocus
          size="sm"
          value={row[field]}
          onChange={(e) => handleCellEdit(row.id, field, e.target.value)}
          onBlur={handleBlur}
        />
      );
    }

    return (
      <div onDoubleClick={() => handleDoubleClick(row.id, field)}>
        {row[field]}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Debug Test Cases</ModalHeader>
            <ModalBody>
              <Table
                aria-label="Test cases table"
                selectionMode="multiple"
                className="mb-4"
              >
                <TableHeader>
                  <TableColumn>NAME</TableColumn>
                  {inputFields.map(field => (
                    <TableColumn key={field}>{field.toUpperCase()}</TableColumn>
                  ))}
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {testData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{renderCell(row, 'name')}</TableCell>
                      {inputFields.map(field => (
                        <TableCell key={field}>
                          {renderCell(row, field)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleDeleteRow(row.id)}
                        >
                          <Icon icon="solar:trash-bin-trash-linear" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex gap-2">
                <Input
                  placeholder="Test case name"
                  value={newRow.name}
                  onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                />
                {inputFields.map(field => (
                  <Input
                    key={field}
                    placeholder={field}
                    value={newRow[field]}
                    onChange={(e) => setNewRow({ ...newRow, [field]: e.target.value })}
                  />
                ))}
                <Button color="primary" onPress={handleAddRow}>
                  Add Row
                </Button>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Close
              </Button>
              <Button color="primary" onPress={onClose}>
                Save Tests
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DebugModal;
