import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Progress,
  useDisclosure
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { runWorkflow } from '../utils/api';
import Header from '../components/Header';

const BatchMode = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const workflows = [
    { key: "1", name: 'Workflow 1' },
    { key: "2", name: 'Workflow 2' },
    { key: "3", name: 'Workflow 3' },
  ];

  const columns = [
    { key: "name", label: "WORKFLOW NAME" },
    { key: "action", label: "ACTION" },
  ];

  const handleRunClick = (workflow) => {
    setSelectedWorkflow(workflow);
    onOpen();
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleRunWorkflow = async () => {
    if (!file) {
      alert('Please upload a file');
      return;
    }

    try {
      // Simulate workflow run and progress
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      // Call the API to run the workflow (this is a placeholder)
      await runWorkflow({ workflowId: selectedWorkflow.key, file });
    } catch (error) {
      console.error('Error running workflow:', error);
    }
  };

  return (
    <div>
      <Header activePage="batch" />
      <h1>Batch Mode</h1>
      <Table aria-label="Saved Workflows">
        <TableHeader columns={columns}>
          {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
        </TableHeader>
        <TableBody items={workflows}>
          {(workflow) => (
            <TableRow key={workflow.key}>
              {(columnKey) => (
                <TableCell>
                  {columnKey === "action" ? (
                    <Button onPress={() => handleRunClick(workflow)}>Run</Button>
                  ) : (
                    getKeyValue(workflow, columnKey)
                  )}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Run {selectedWorkflow?.name}
              </ModalHeader>
              <ModalBody>
                <Input
                  type="file"
                  accept=".csv,.jsonl"
                  onChange={handleFileChange}
                  label="Upload CSV or JSONL"
                />
                {progress > 0 && <Progress value={progress} />}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="primary"
                  onPress={handleRunWorkflow}
                  disabled={progress > 0 && progress < 100}
                >
                  {progress > 0 && progress < 100 ? 'Running...' : 'Run'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default BatchMode;