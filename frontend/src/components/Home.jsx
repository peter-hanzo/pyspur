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
import Header from './Header';
import { useRouter } from 'next/router';

const BatchMode = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const workflows = [
    { key: "1", name: 'Workflow 1', lastModified: '2024-10-01' },
    { key: "2", name: 'Workflow 2', lastModified: '2024-09-30' },
    { key: "3", name: 'Workflow 3', lastModified: '2024-09-25' },
  ];

  const columns = [
    { key: "name", label: "NAME" },
    { key: "lastModified", label: "LAST MODIFIED" },
    { key: "action", label: "ACTION" },
  ];

  const activeWorkflows = [
    { key: "1", name: 'Run 1', workflow: 'Workflow 1', dataset: 'dataset1.csv', progress: 30 },
    { key: "2", name: 'Run 2', workflow: 'Workflow 2', dataset: 'dataset2.jsonl', progress: 60 },
    { key: "3", name: 'Run 3', workflow: 'Workflow 3', dataset: 'dataset3.csv', progress: 90 },
  ];

  const activeColumns = [
    { key: "name", label: "RUN NAME" },
    { key: "workflow", label: "WORKFLOW" },
    { key: "dataset", label: "DATASET" },
    { key: "progress", label: "PROGRESS" },
  ];

  const handleRunClick = (workflow) => {
    setSelectedWorkflow(workflow);
    onOpen();
  };

  const handleEditClick = (workflow) => {
    router.push({
      pathname: '/workflow',
      query: { workflowId: workflow.key },
    });
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
    <div className="flex flex-col gap-2">
      <div className="w-3/4 mx-auto p-5">

        {/* Dashboard Header */}
        <header className="mb-6 flex w-full items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-default-900 lg:text-3xl">Dashboard</h1>
            <p className="text-small text-default-400 lg:text-medium">Manage your workflows</p>
          </div>
          <Button
            className="bg-foreground text-background"
            startContent={
              <Icon className="flex-none text-background/60" icon="lucide:plus" width={16} />
            }
          >
            New Workflow
          </Button>
        </header>

        <h3 className="text-xl font-semibold mb-4">Recent Workflows</h3>
        <Table aria-label="Saved Workflows" isHeaderSticky>
          <TableHeader columns={columns}>
            {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
          </TableHeader>
          <TableBody items={workflows}>
            {(workflow) => (
              <TableRow key={workflow.key}>
                {(columnKey) => (
                  <TableCell>
                    {columnKey === "action" ? (
                      <div className="flex items-center gap-2">
                        <Icon
                          icon="solar:play-bold"
                          className="cursor-pointer text-default-400"
                          height={18}
                          width={18}
                          onClick={() => handleRunClick(workflow)}
                        />
                        <Icon
                          icon="solar:pen-bold"
                          className="cursor-pointer text-default-400"
                          height={18}
                          width={18}
                          onClick={() => handleEditClick(workflow)}
                        />
                      </div>
                    ) : (
                      getKeyValue(workflow, columnKey)
                    )}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>

        <h3 className="text-xl font-semibold mt-8 mb-4">Active Workflow Jobs</h3>
        <Table aria-label="Active Workflows" isHeaderSticky>
          <TableHeader columns={activeColumns}>
            {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
          </TableHeader>
          <TableBody items={activeWorkflows}>
            {(workflow) => (
              <TableRow key={workflow.key}>
                {(columnKey) => (
                  <TableCell>
                    {columnKey === "progress" ? (
                      <Progress value={workflow.progress} />
                    ) : (
                      getKeyValue(workflow, columnKey)
                    )}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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