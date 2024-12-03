import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  Input
} from "@nextui-org/react";
import { Icon } from "@iconify/react";
import TextEditor from '../textEditor/TextEditor';
import { addTestInput, deleteTestInput } from '../../store/flowSlice';
import { RootState } from '../../store/store';
import { AppDispatch } from '../../store/store';

interface RunModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRun: (initialInputs: Record<string, any>) => void;
  onSave?: () => void;
}

interface TestInput {
  id: number;
  [key: string]: any;
}

interface EditingCell {
  rowId: number;
  field: string;
}

const RunModal: React.FC<RunModalProps> = ({ isOpen, onOpenChange, onRun, onSave }) => {
  const workflowInputVariables = useSelector((state: RootState) => state.flow.workflowInputVariables);
  const workflowInputVariableNames = Object.keys(workflowInputVariables || {});

  const [testData, setTestData] = useState<TestInput[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [editorContents, setEditorContents] = useState<Record<string, string>>({});

  const dispatch = useDispatch<AppDispatch>();
  const nodes = useSelector((state: RootState) => state.flow.nodes);
  const edges = useSelector((state: RootState) => state.flow.edges);
  const testInputs = useSelector((state: RootState) => state.flow.testInputs);

  useEffect(() => {
    setTestData(testInputs);
  }, [testInputs]);

  const handleAddRow = () => {
    const newTestInput: TestInput = {
      id: Date.now(),
      ...editorContents,
    };
    setTestData([...testData, newTestInput]);
    setEditorContents({});
    dispatch(addTestInput(newTestInput));
  };

  const handleDeleteRow = (id: number) => {
    setTestData(testData.filter((row) => row.id !== id));
    dispatch(deleteTestInput({ id }));
  };

  const handleDoubleClick = (rowId: number, field: string) => {
    setEditingCell({ rowId, field });
  };

  const handleCellEdit = (rowId: number, field: string, value: string) => {
    setTestData(testData.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  const handleBlur = () => {
    setEditingCell(null);
  };

  const renderCell = (row: TestInput, field: string) => {
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
        <div dangerouslySetInnerHTML={{ __html: row[field] }} />
      </div>
    );
  };

  const handleRun = () => {
    if (!selectedRow) return;

    const selectedTestCase = testData.find(row => row.id.toString() === selectedRow);
    if (!selectedTestCase) return;

    const { id, ...inputValues } = selectedTestCase;
    const inputNodeId = nodes.find(node => node.type === 'InputNode')?.id;

    if (!inputNodeId) return;

    const initialInputs = {
      [inputNodeId]: inputValues
    };

    onRun(initialInputs);
  };

  const handleSave = () => {
    if (typeof onSave === 'function') {
      onSave();
    }
    onOpenChange(false);
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
              Select Test Input To Run or Save
            </ModalHeader>
            <ModalBody>
              <Table
                aria-label="Test cases table"
                selectionMode="single"
                selectedKeys={selectedRow ? [selectedRow] : new Set()}
                onSelectionChange={(selection) => {
                  const selectedKey = Array.from(selection)[0]?.toString() || null;
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
                  <div key={field} className="flex-1">
                    <TextEditor
                      nodeID={`newRow-${field}`}
                      fieldName={field}
                      fieldTitle={field}
                      inputSchema={{}}
                      content={editorContents[field] || ''}
                      setContent={(value: string) => {
                        setEditorContents(prev => ({
                          ...prev,
                          [field]: value
                        }));
                      }}
                    />
                  </div>
                ))}
                <Button
                  color="primary"
                  onPress={handleAddRow}
                  isDisabled={Object.values(editorContents).every(v => !v?.trim())}
                >
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
                onPress={handleSave}
              >
                Save
              </Button>
              <Button
                color="primary"
                onPress={() => {
                  handleRun();
                  onClose();
                }}
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

export default RunModal;