import React, { useState, useEffect } from 'react';
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

const DebugModal = ({ isOpen, onOpenChange, onRun }) => {
  const workflowInputVariables = useSelector(state => state.flow.workflowInputVariables);

  const workflowInputVariableNames = Object.keys(workflowInputVariables || {});
  const [testData, setTestData] = useState([]);
  const [newRow, setNewRow] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const nodes = useSelector(state => state.flow.nodes);
  const edges = useSelector(state => state.flow.edges);

  const handleAddRow = () => {
    setTestData([
      ...testData,
      {
        id: testData.length + 1,
        ...newRow
      }
    ]);
    setNewRow(workflowInputVariableNames.reduce((acc, field) => ({ ...acc, [field]: "" }), {}));
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

  const handleKeyDown = (e) => {
    // Check if any of the input fields have values before allowing row addition
    const hasValues = Object.values(newRow).some(value => value !== "");
    if (e.key === 'Enter' && hasValues) {
      handleAddRow();
    }
  };

  const getNodeNameById = (nodeId, nodes) => {
    const node = nodes.find(node => node.id === nodeId);
    console.log('Node:', node);
    return node ? node.type : null;
  };

  const handleRun = () => {
    if (!selectedRow) return;
  
    // Find the selected test data
    const selectedTestCase = testData.find(row => row.id == selectedRow);
    if (!selectedTestCase) return;
  
    // Remove the id field from the test case
    const { id, ...inputValues } = selectedTestCase;
    console.log('Selected Test Case:', inputValues);
  
    // Get the edges and nodes from the redux store
  
    // Initialize the initialInputs structure
    const initialInputs = { "initial_inputs": {} };
  
    // Find all edges with source as inputNode
    edges.forEach(edge => {
      if (getNodeNameById(edge.source, nodes) === 'InputNode') { // Assuming 'inputNode' is the ID of the input node
        const targetNodeId = edge.target;
        console.log('Target Node ID:', targetNodeId);
        const inputKey = edge.sourceHandle;
  
        // Check if the inputKey exists in the selectedTestCase
        if (inputValues.hasOwnProperty(inputKey)) {
          if (!initialInputs.initial_inputs[targetNodeId]) {
            initialInputs.initial_inputs[targetNodeId] = {};
          }
          initialInputs.initial_inputs[targetNodeId][inputKey] = inputValues[inputKey];
        }
      }
    });

    console.log('Initial Inputs:', initialInputs);
  
    // Call the onRun callback with the constructed initialInputs
    onRun(initialInputs);
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
            <ModalHeader className="flex flex-col gap-1">
              Select Test Input To Run
            </ModalHeader>
            <ModalBody>
              <Table
                aria-label="Test cases table"
                selectionMode="single"
                selectedKeys={selectedRow ? [selectedRow] : new Set()}
                onSelectionChange={(selection) => {
                  const selectedKey = Array.from(selection)[0];
                  setSelectedRow(selectedKey);
                }}
              >
                <TableHeader>
                  <TableColumn>#</TableColumn>
                  {workflowInputVariableNames.map(field => (
                    <TableColumn key={field}>{field.toUpperCase()}</TableColumn>
                  ))}
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {testData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      {workflowInputVariableNames.map(field => (
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
                {workflowInputVariableNames.map(field => (
                  <Input
                    key={field}
                    placeholder={field}
                    value={newRow[field]}
                    onChange={(e) => setNewRow({ ...newRow, [field]: e.target.value })}
                    onKeyDown={handleKeyDown}
                  />
                ))}
                <Button color="primary" onPress={handleAddRow}>
                  Add Row
                </Button>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleRun}
                isDisabled={!selectedRow}
              >
                Run
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DebugModal;
