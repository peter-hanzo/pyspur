import React, { useState, useEffect } from 'react';
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
import { runWorkflow, getWorkflows, createWorkflow } from '../utils/api';
import Header from './Header';
import { useRouter } from 'next/router';
import TemplateCard from './TemplateCard';

const Dashboard = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const data = await getWorkflows();
        console.log('Workflows:', data.workflows);
        setWorkflows(data.workflows);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      }
    };

    fetchWorkflows();
  }, []);

  // const workflows = [
  //   { key: "1", name: 'Workflow 1', lastModified: '2024-10-01' },
  //   { key: "2", name: 'Workflow 2', lastModified: '2024-09-30' },
  //   { key: "3", name: 'Workflow 3', lastModified: '2024-09-25' },
  // ];

  // const columns = [
  //   { key: "name", label: "NAME" },
  //   { key: "lastModified", label: "LAST MODIFIED" },
  //   { key: "action", label: "ACTION" },
  // ];

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "action", label: "Action" },
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

  const templates = [
    {
      id: 1,
      title: "AI Trader",
      description: "Template for basic data processing workflows",
      features: [
        "CSV/JSON handling",
        "Data cleaning",
        "Format conversion"
      ]
    },
    {
      id: 2,
      title: "AI Researcher",
      description: "NLP workflow template for text analysis",
      features: [
        "Sentiment analysis",
        "Entity extraction",
        "Text classification"
      ]
    },
    {
      id: 3,
      title: "AI Podcaster",
      description: "Template for API-based workflows",
      features: [
        "REST API endpoints",
        "Data transformation",
        "Error handling"
      ]
    }
  ];

  const handleRunClick = (workflow) => {
    setSelectedWorkflow(workflow);
    onOpen();
  };

  const handleEditClick = (workflow) => {
    router.push({
      pathname: `/workflows/${workflow.id}`,
    });
  };

  // const handleEditClick = (workflow) => {
  //   router.push({
  //     pathname: '/workflow',
  //     query: { workflowId: workflow.key },
  //   });
  // };

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

  // const handleNewWorkflowClick = () => {
  //   router.push('/workflow');
  // };

  const handleNewWorkflowClick = async () => {
    try {
      // Generate a unique name for the new workflow
      const uniqueName = `New Workflow ${Date.now()}`;
  
      // Create an empty workflow object
      const newWorkflow = {
        name: uniqueName,
        description: '',
        definition: {
          nodes: [],
          links: []
        },
      };
  
      // Call the API to create the workflow
      const createdWorkflow = await createWorkflow(newWorkflow);
  
      // Navigate to the new workflow's page using its ID
      router.push(`/workflows/${createdWorkflow.id}`);
    } catch (error) {
      console.error('Error creating new workflow:', error);
    }
  };

  const handleUseTemplate = (templateId) => {
    router.push({
      pathname: '/workflow',
      query: { templateId },
    });
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
            onClick={handleNewWorkflowClick}
          >
            New Workflow
          </Button>
        </header>

        {/* New Templates Section */}
        <h3 className="text-xl font-semibold mb-4">Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 px-1 mb-8">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              title={template.title}
              description={template.description}
              features={template.features}
              onUse={() => handleUseTemplate(template.id)}
            />
          ))}
        </div>

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

export default Dashboard;