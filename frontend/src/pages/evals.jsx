import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import { getEvals, startEvalRun, listEvalRuns, getEvalRunStatus } from "../utils/api";
import EvalCard from "../components/cards/EvalCard";
import { Spinner, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@nextui-org/react";
import { toast } from "sonner";

const EvalsPage = () => {
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evalResults, setEvalResults] = useState(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const router = useRouter();
  const { id: workflowId } = router.query;
  const [evalRuns, setEvalRuns] = useState([]);

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

  useEffect(() => {
    const fetchEvalRuns = async () => {
      try {
        const runsData = await listEvalRuns();
        setEvalRuns(runsData);
      } catch (error) {
        console.error("Error fetching eval runs:", error);
        toast.error("Failed to load eval runs.");
      }
    };
    fetchEvalRuns();
    const interval = setInterval(fetchEvalRuns, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLaunchEval = async (workflowId, evalName, numSamples, outputVariable) => {
    if (!workflowId) {
      toast.error("Workflow ID is missing.");
      return;
    }
    if (!outputVariable) {
      toast.error("Output variable is missing.");
      return;
    }

    toast(`Launching eval with output variable: ${outputVariable} and ${numSamples} samples...`);
    try {
      const results = await startEvalRun(workflowId, evalName, numSamples, outputVariable);
      setEvalResults(results);
      onOpen();
      toast.success(`Eval completed successfully.`);
    } catch (error) {
      console.error(`Error launching eval:`, error);
      toast.error(`Failed to launch eval.`);
    }
  };

  const handleViewResults = async (evalRunId) => {
    try {
      const evalRunData = await getEvalRunStatus(evalRunId);
      setEvalResults(evalRunData.results);
      onOpen();
    } catch (error) {
      console.error("Error fetching eval results:", error);
      toast.error("Failed to fetch eval results.");
    }
  };

  return (
    <div className="App relative">
      <Header activePage="evals" />
      <div className="p-6">
        {/* Eval Jobs Table Section */}
        <h1 className="text-2xl font-bold mt-8 mb-4">Eval Jobs</h1>
        {evalRuns.length > 0 ? (
          <Table aria-label="Eval Jobs Table" isHeaderSticky>
            <TableHeader>
              <TableColumn>Run ID</TableColumn>
              <TableColumn>Eval Name</TableColumn>
              <TableColumn>Workflow ID</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody items={evalRuns}>
              {(run) => (
                <TableRow key={run.run_id}>
                  <TableCell>{run.run_id}</TableCell>
                  <TableCell>{run.eval_name}</TableCell>
                  <TableCell>{run.workflow_id}</TableCell>
                  <TableCell>{run.status}</TableCell>
                  <TableCell>
                    {run.status === "COMPLETED" ? (
                      <Button
                        size="sm"
                        onPress={() => handleViewResults(run.run_id)}
                      >
                        View Results
                      </Button>
                    ) : (
                      <p>--</p>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <p>No eval runs available.</p>
        )}

        {/* Add spacing between sections */}
        <div className="my-8"></div>

        {/* Available Evals Section */}
        <h1 className="text-2xl font-bold mt-8 mb-4">Available Evals</h1>
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
                onRun={(workflowId, numSamples, outputVariable) =>
                  handleLaunchEval(workflowId, evalItem.name, numSamples, outputVariable)
                }
              />
            ))}
          </div>
        ) : (
          <p>No evals available.</p>
        )}

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
    </div>
  );
};

export default EvalsPage;