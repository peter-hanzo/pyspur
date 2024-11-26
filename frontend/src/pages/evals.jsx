import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import { getEvals, startEvalRun } from "../utils/api";
import EvalCard from "../components/cards/EvalCard";
import { Spinner, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { toast } from "sonner";

const EvalsPage = () => {
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evalResults, setEvalResults] = useState(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const router = useRouter();
  const { id: workflowId } = router.query;

  useEffect(() => {
    const fetchEvals = async () => {
      try {
        const evalsData = await getEvals();
        setEvals(evalsData);
      } catch (error) {
        console.error("Error fetching evals:", error);
        toast.error("Failed to load evals.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvals();
  }, []);

  const handleLaunchEval = async (workflowId, evalName, outputVariable, numSamples) => {
    if (!workflowId) {
      toast.error("Workflow ID is missing.");
      return;
    }
    if (!outputVariable) {
      toast.error("Output variable is missing.");
      return;
    }

    toast(`Launching eval: ${evalName} with output variable: ${outputVariable} and ${numSamples} samples...`);
    try {
      const results = await startEvalRun(workflowId, evalName, outputVariable, numSamples);
      setEvalResults(results);
      onOpen();
      toast.success(`Eval "${evalName}" completed successfully.`);
    } catch (error) {
      console.error(`Error launching eval "${evalName}":`, error);
      toast.error(`Failed to launch eval "${evalName}".`);
    }
  };

  return (
    <div className="App relative">
      <Header activePage="evals" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Available Evals</h1>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        ) : evals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {evals.map((evalItem) => (
              <EvalCard
                key={evalItem.name}
                title={evalItem.name}
                description={evalItem.description}
                type={evalItem.type}
                numSamples={evalItem.num_samples}
                paperLink={evalItem.paper_link}
                onRun={() => handleLaunchEval(workflowId, evalItem.name, evalItem.output_variable, evalItem.num_samples)}
              />
            ))}
          </div>
        ) : (
          <p>No evals available.</p>
        )}
      </div>

      {/* Modal for displaying eval results */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Evaluation Results</ModalHeader>
              <ModalBody>
                {evalResults ? (
                  <pre className="text-sm bg-gray-100 p-4 rounded">{JSON.stringify(evalResults, null, 2)}</pre>
                ) : (
                  <p>No results available.</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default EvalsPage;