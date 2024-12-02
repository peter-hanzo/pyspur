import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "../../components/Header";
import { getEvalRunStatus } from "../../utils/api";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Spinner, Chip } from "@nextui-org/react";
import { toast } from "sonner";

const EvalResultsPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!id) return;

      try {
        const evalRunData = await getEvalRunStatus(id);
        console.log("Eval run data received:", evalRunData);

        const normalizedResults = {
          run_id: evalRunData.run_id,
          eval_name: evalRunData.eval_name,
          accuracy: evalRunData.results.accuracy,
          per_example_results: evalRunData.results.subset_metrics?.default?.per_example_results || []
        };

        setResults(normalizedResults);
      } catch (error) {
        console.error("Error fetching eval results:", error);
        toast.error("Failed to fetch eval results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  const renderProblemContent = (problem) => {
    // If it's a multiple choice question (has choices)
    if (problem.choice1 || problem.choice2 || problem.choice3 || problem.choice4) {
      return (
        <>
          <p className="text-sm">{problem.Question}</p>
          <div className="mt-2 text-sm text-gray-600">
            {problem.choice1 && <div>A. {problem.choice1}</div>}
            {problem.choice2 && <div>B. {problem.choice2}</div>}
            {problem.choice3 && <div>C. {problem.choice3}</div>}
            {problem.choice4 && <div>D. {problem.choice4}</div>}
          </div>
        </>
      );
    }

    // For non-multiple choice questions
    return (
      <div className="text-sm">
        {/* Display the question if it exists */}
        {problem.Question && <p>{problem.Question}</p>}

        {/* If there's no Question field, display the problem text directly */}
        {!problem.Question && typeof problem === 'string' && <p>{problem}</p>}

        {/* If the problem is an object without a Question field, display relevant fields */}
        {!problem.Question && typeof problem === 'object' && (
          Object.entries(problem)
            .filter(([key]) => key !== 'answer' && key !== 'explanation')
            .map(([key, value]) => (
              <div key={key} className="mb-2">
                <span className="font-medium">{key}: </span>
                <span>{value}</span>
              </div>
            ))
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header activePage="evals" />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!results || !results.per_example_results) {
    return (
      <div className="min-h-screen">
        <Header activePage="evals" />
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Eval Run Results</h1>
          <p>No results available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header activePage="evals" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Eval Run Results</h1>
            <div className="text-gray-600 mt-2">
              Run ID: {results?.run_id} • Eval: {results?.eval_name}
            </div>
          </div>
          <Chip
            color="success"
            variant="flat"
            size="lg"
          >
            Accuracy: {(results.accuracy * 100).toFixed(1)}%
          </Chip>
        </div>

        <Table aria-label="Eval results table" isHeaderSticky>
          <TableHeader>
            <TableColumn>Example ID</TableColumn>
            <TableColumn width="40%">Problem</TableColumn>
            <TableColumn>Predicted</TableColumn>
            <TableColumn>Ground Truth</TableColumn>
            <TableColumn>Status</TableColumn>
          </TableHeader>
          <TableBody items={results.per_example_results}>
            {(item) => (
              <TableRow key={item.example_id || item.task_id || `result-${item.predicted_answer}-${item.ground_truth_answer}`}>
                <TableCell>{item.example_id || item.task_id}</TableCell>
                <TableCell>
                  <div className="max-h-32 overflow-y-auto">
                    {renderProblemContent(item.problem)}
                  </div>
                </TableCell>
                <TableCell>
                  {item.predicted_answer}
                </TableCell>
                <TableCell>
                  {item.ground_truth_answer}
                </TableCell>
                <TableCell>
                  <Chip
                    color={item.is_correct ? "success" : "danger"}
                    variant="flat"
                  >
                    {item.is_correct ? "Correct" : "Incorrect"}
                  </Chip>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EvalResultsPage;
