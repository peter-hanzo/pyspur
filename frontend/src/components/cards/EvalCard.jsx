import React, { useState, useEffect } from "react";
import { Card, CardBody, CardFooter, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { getWorkflows } from "../../utils/api"; // Import the getWorkflows API function
import { toast } from "sonner";

export default function EvalCard({ title, description, type, dataPoints, paperLink, onRun }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  // Fetch workflows when the modal opens
  useEffect(() => {
    if (isModalOpen) {
      const fetchWorkflows = async () => {
        try {
          const workflowsData = await getWorkflows();
          setWorkflows(workflowsData);
        } catch (error) {
          console.error("Error fetching workflows:", error);
          toast.error("Failed to load workflows.");
        }
      };

      fetchWorkflows();
    }
  }, [isModalOpen]);

  const handleRunEval = () => {
    if (!selectedWorkflow) {
      toast.error("Please select a workflow.");
      return;
    }

    // Pass the selected workflow ID to the onRun function
    onRun(selectedWorkflow);
    setIsModalOpen(false); // Close the modal
  };

  return (
    <>
      <Card className="relative w-full">
        <CardBody className="relative min-h-[220px] bg-gradient-to-br from-content1 to-default-100/50 p-6">
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-default-500 text-sm mb-3">{description}</p>
          <p className="text-default-500 text-sm mb-1"><strong>Type:</strong> {type}</p>
          <p className="text-default-500 text-sm mb-1"><strong>Data Points:</strong> {dataPoints}</p>
          {paperLink && (
            <a href={paperLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm">
              Original Paper
            </a>
          )}
        </CardBody>
        <CardFooter className="border-t-1 border-default-100 justify-end py-2 px-4">
          <Button
            color="primary"
            variant="flat"
            onPress={() => setIsModalOpen(true)} // Open the modal
            startContent={<Icon icon="solar:play-linear" width={16} />}
          >
            Run Eval
          </Button>
        </CardFooter>
      </Card>

      {/* Modal for selecting a workflow */}
      <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Select Workflow</ModalHeader>
              <ModalBody>
                <Dropdown>
                  <DropdownTrigger>
                    <Button variant="flat" color="primary">
                      {selectedWorkflow ? selectedWorkflow.name : "Select a Workflow"}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Workflows"
                    onAction={(key) => {
                      const workflow = workflows.find((wf) => wf.id === key);
                      setSelectedWorkflow(workflow);
                    }}
                  >
                    {workflows.map((workflow) => (
                      <DropdownItem key={workflow.id}>{workflow.name}</DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleRunEval}>
                  Run Eval
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}