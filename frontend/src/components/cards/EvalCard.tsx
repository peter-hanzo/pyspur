import React, { useState, useEffect } from "react";
import { Card, CardBody, CardFooter, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Slider, DropdownSection } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { getWorkflows, getWorkflowOutputVariables, startEvalRun } from "../../utils/api";
import { toast } from "sonner";
import { Key } from "@react-types/shared";

interface EvalCardProps {
  title: string;
  description: string;
  type: string;
  numSamples: number;
  paperLink?: string;
  onRun?: () => void;
}

interface Workflow {
  id: string;
  name: string;
}

interface OutputVariable {
  node_id: string;
  variable_name: string;
  prefixed_variable: string;
}

export default function EvalCard({ title, description, type, numSamples, paperLink, onRun }: EvalCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [outputVariables, setOutputVariables] = useState<OutputVariable[]>([]);
  const [selectedOutputVariable, setSelectedOutputVariable] = useState<string | null>(null);
  const [selectedNumSamples, setSelectedNumSamples] = useState(1);

  // Rest of the component remains the same, but now with proper typing
  useEffect(() => {
    if (isModalOpen) {
      console.log("eval information", title, description, type, numSamples, paperLink);
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

  useEffect(() => {
    if (selectedWorkflow) {
      const fetchOutputVariables = async () => {
        try {
          const variables = await getWorkflowOutputVariables(selectedWorkflow.id);
          setOutputVariables(variables);
        } catch (error) {
          console.error("Error fetching output variables:", error);
          toast.error("Failed to load output variables.");
        }
      };

      fetchOutputVariables();
    }
  }, [selectedWorkflow]);

  const handleRunEval = async () => {
    if (!selectedWorkflow) {
      toast.error("Please select a workflow.");
      return;
    }
    if (!selectedOutputVariable) {
      toast.error("Please select an output variable.");
      return;
    }

    try {
      const evalRunResponse = await startEvalRun(
        selectedWorkflow.id,
        title,
        selectedNumSamples,
        selectedOutputVariable
      );
      toast.success(`Eval run started with ID: ${evalRunResponse.run_id}`);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error starting eval run:", error);
      toast.error("Failed to start eval run.");
    }
  };

  return (
    <>
      <Card className="relative w-full">
        <CardBody className="relative min-h-[220px] bg-gradient-to-br from-content1 to-default-100/50 p-6">
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-default-500 text-sm mb-3">{description}</p>
          <p className="text-default-500 text-sm mb-1"><strong>Type:</strong> {type}</p>
          <p className="text-default-500 text-sm mb-1"><strong>Num Samples:</strong> {numSamples}</p>
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
            onPress={() => setIsModalOpen(true)}
            startContent={<Icon icon="solar:play-linear" width={16} />}
          >
            Run Eval
          </Button>
        </CardFooter>
      </Card>

      <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Eval Configuration</ModalHeader>
              <ModalBody>
                <h3 className="text-sm font-semibold mb-2">Select a Workflow</h3>
                <Dropdown>
                  <DropdownTrigger>
                    <Button variant="flat" color="primary">
                      {selectedWorkflow ? selectedWorkflow.name : "Select a Workflow"}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Workflows"
                    onAction={(key: Key) => {
                      const workflow = workflows.find((wf) => wf.id === key.toString());
                      if (workflow) {
                        setSelectedWorkflow(workflow);
                        setSelectedOutputVariable(null);
                      }
                    }}
                  >
                    {workflows.map((workflow) => (
                      <DropdownItem key={workflow.id}>{workflow.name}</DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>

                {selectedWorkflow && (
                  <>
                    <h3 className="text-sm font-semibold mt-4 mb-2">Select an Output Variable</h3>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button variant="flat" color="primary">
                          {selectedOutputVariable || "Select an Output Variable"}
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Output Variables"
                        onAction={(key: Key) => setSelectedOutputVariable(key.toString())}
                      >
                        {Object.entries(
                          outputVariables.reduce<Record<string, { variable_name: string; prefixed_variable: string }[]>>((acc, variable) => {
                            const { node_id, variable_name, prefixed_variable } = variable;
                            if (!acc[node_id]) acc[node_id] = [];
                            acc[node_id].push({ variable_name, prefixed_variable });
                            return acc;
                          }, {})
                        ).map(([nodeId, variables]) => (
                          <DropdownSection key={nodeId} title={`Node: ${nodeId}`}>
                            {variables.map(({ variable_name, prefixed_variable }) => (
                              <DropdownItem key={prefixed_variable}>
                                {variable_name}
                              </DropdownItem>
                            ))}
                          </DropdownSection>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  </>
                )}

                <h3 className="text-sm font-semibold mt-4 mb-2">Select Number of Samples</h3>
                <Slider
                  label="Number of Samples"
                  step={1}
                  maxValue={numSamples}
                  minValue={1}
                  defaultValue={1}
                  value={selectedNumSamples}
                  onChange={(value) => setSelectedNumSamples(Number(value))}
                  className="max-w-md"
                />
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