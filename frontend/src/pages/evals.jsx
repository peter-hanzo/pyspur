import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import { getEvals, startEvalRun, listEvalRuns, getEvalRunStatus } from "../utils/api";
import EvalCard from "../components/cards/EvalCard";
import { Spinner, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from "@nextui-org/react";
import { toast } from "sonner";
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

const statusColorMap = {
  PENDING: "warning",
  RUNNING: "primary",
  COMPLETED: "success",
  FAILED: "danger",
};

const EvalsPage = () => {
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
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

  // Helper function to safely parse results
  const parseResults = (results) => {
    if (!results) return null;
    if (typeof results === "string") {
      try {
        return JSON.parse(results);
      } catch (error) {
        console.error("Error parsing results:", error);
        return null;
      }
    }
    return results; // If already an object
  };

  useEffect(() => {
    const fetchEvalRuns = async () => {
      try {
        const runsData = await listEvalRuns();

        // For each completed run, fetch the results
        const runsDataWithResults = await Promise.all(
          runsData.map(async (run) => {
            if (run.status === "COMPLETED") {
              try {
                const evalRunData = await getEvalRunStatus(run.run_id);
                const parsedResults = parseResults(evalRunData.results);
                return {
                  ...run,
                  results: parsedResults,
                };
              } catch (error) {
                console.error(`Error fetching results for run ${run.run_id}:`, error);
                return run; // Return run without results
              }
            } else {
              // For pending or running runs, just return the run as is
              return run;
            }
          })
        );

        setEvalRuns(runsDataWithResults);
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
      toast.success(`Eval run started.`);
    } catch (error) {
      console.error(`Error launching eval:`, error);
      toast.error(`Failed to launch eval.`);
    }
  };

  const handleViewResults = async (evalRunId) => {
    router.push(`/evals/${evalRunId}`);
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
              <TableColumn>Accuracy</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody items={evalRuns}>
              {(run) => (
                <TableRow key={run.run_id}>
                  <TableCell>{run.run_id}</TableCell>
                  <TableCell>{run.eval_name}</TableCell>
                  <TableCell>{run.workflow_id}</TableCell>
                  <TableCell>
                    <Chip
                      className="capitalize"
                      color={statusColorMap[run.status]}
                      size="sm"
                      variant="flat"
                    >
                      {run.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {run.results && run.results.accuracy !== undefined ? (
                      <div style={{ width: 50, height: 50 }}>
                        <RadialBarChart
                          width={50}
                          height={50}
                          cx={25}
                          cy={25}
                          innerRadius={20}
                          outerRadius={25}
                          barSize={5}
                          data={[{ name: 'Accuracy', value: run.results.accuracy * 100 }]}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <RadialBar
                            minAngle={15}
                            background
                            clockWise
                            dataKey="value"
                            cornerRadius={10}
                            fill="#4ade80"
                          />
                          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                          <text
                            x={25}
                            y={25}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fontSize: "10px", fill: "#333" }}
                          >
                            {`${(run.results.accuracy * 100).toFixed(1)}%`}
                          </text>
                        </RadialBarChart>
                      </div>
                    ) : run.status === "COMPLETED" ? (
                      "N/A"
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell>
                    {run.status === "COMPLETED" ? (
                      <Button size="sm" onPress={() => handleViewResults(run.run_id)}>
                        View Examples
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
      </div>
    </div>
  );
};

export default EvalsPage;