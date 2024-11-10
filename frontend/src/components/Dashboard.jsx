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
import { getWorkflows, createWorkflow, uploadDataset, startBatchRun, deleteWorkflow, updateWorkflow } from '../utils/api';
import { useRouter } from 'next/router';
import TemplateCard from './TemplateCard';
import WorkflowBatchRunsTable from './WorkflowBatchRunsTable';

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
        const workflows = await getWorkflows();
        setWorkflows(workflows);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      }
    };

    fetchWorkflows();
  }, []);


  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "action", label: "Action" },
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
    let uploadedDataset;
    // upload file as dataset
    try {
      // Generate a unique name for the dataset using the current timestamp
      const datasetName = `Dataset_${Date.now()}`;
      const datasetDescription = `Uploaded dataset for workflow ${selectedWorkflow.name}`;

      // Call the API to upload the dataset
      uploadedDataset = await uploadDataset(datasetName, datasetDescription, file);

      console.log('Dataset uploaded successfully:', uploadedDataset);
    } catch (error) {
      console.error('Error uploading dataset:', error);
      alert('Failed to upload dataset. Please try again.');
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

      // Call the API to start a batch workflow run
      await startBatchRun(selectedWorkflow.id, uploadedDataset.id);
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

      };

      // Call the API to create the workflow
      const createdWorkflow = await createWorkflow(newWorkflow);

      // Navigate to the new workflow's page using its ID
      router.push(`/workflows/${createdWorkflow.id}`);
    } catch (error) {
      console.error('Error creating new workflow:', error);
    }
  };

  const handleImportWorkflowClick = async () => {
    try {
      // Ask the user to upload a JSON file
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'application/json';
      fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) {
          alert('No file selected. Please try again.');
          return;
        }

        // Read the file content
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const jsonContent = JSON.parse(e.target.result);

            // Generate a unique name for the new workflow
            const uniqueName = `Imported Workflow ${Date.now()}`;

            // Create an empty workflow object
            const newWorkflow = {
              name: uniqueName,
              description: '',
            };

            // Call the API to create the workflow
            const createdWorkflow = await createWorkflow(newWorkflow);

            // Update the newly created workflow with the JSON content
            await updateWorkflow(createdWorkflow.id, jsonContent);

            // Navigate to the new workflow's page using its ID
            router.push(`/workflows/${createdWorkflow.id}`);
          } catch (error) {
            console.error('Error processing the JSON file:', error);
            alert('Failed to import workflow. Please ensure the file is a valid JSON.');
          }
        };
        reader.readAsText(file);
      };
      fileInput.click();
    } catch (error) {
      console.error('Error importing workflow:', error);
    }
  };

  const handleUseTemplate = (templateId) => {
    router.push({
      pathname: '/workflow',
      query: { templateId },
    });
  };

  const handleDeleteClick = async (workflow) => {
    if (window.confirm(`Are you sure you want to delete workflow "${workflow.name}"?`)) {
      try {
        // Call the API to delete the workflow
        await deleteWorkflow(workflow.id);

        // Remove the deleted workflow from the state
        setWorkflows((prevWorkflows) => prevWorkflows.filter((w) => w.id !== workflow.id));

        console.log(`Workflow "${workflow.name}" deleted successfully.`);
      } catch (error) {
        console.error('Error deleting workflow:', error);
        alert('Failed to delete workflow. Please try again.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="w-3/4 mx-auto p-5">

        {/* Dashboard Header */}
        <header className="mb-6 flex w-full items-center">
          <div className="flex flex-col max-w-fit" id="dashboard-title">
            <h1 className="text-xl font-bold text-default-900 lg:text-3xl">Dashboard</h1>
            <p className="text-small text-default-400 lg:text-medium">Manage your workflows</p>
          </div>
          <div className="ml-auto flex items-center gap-2" id="new-workflow-entries">
            <Button
              className="bg-foreground text-background"
              startContent={
                <Icon className="flex-none text-background/60" icon="lucide:plus" width={16} />
              }
              onClick={handleNewWorkflowClick}
            >
              New Workflow
            </Button>
            <Button
              className="bg-foreground text-background"
              startContent={
                <Icon className="flex-none text-background/60" icon="lucide:upload" width={16} />
              }
              onClick={handleImportWorkflowClick}
            >
              Import Workflow
            </Button>
          </div>
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
                        <Icon
                          icon="solar:trash-bin-trash-linear"
                          className="cursor-pointer text-default-400"
                          height={18}
                          width={18}
                          onClick={() => handleDeleteClick(workflow)}
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

        <WorkflowBatchRunsTable/>
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