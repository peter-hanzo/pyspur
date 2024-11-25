import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { getEvals } from "../utils/api";
import EvalCard from "../components/EvalCard";
import { Spinner } from "@nextui-org/react";
import { toast } from "sonner";

const EvalsPage = () => {
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleLaunchEval = async (evalName) => {
    toast(`Launching eval: ${evalName}...`);
    try {
      console.log(`Eval "${evalName}" launched.`);
      toast.success(`Eval "${evalName}" launched successfully.`);
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
                dataPoints={evalItem.data_points}
                paperLink={evalItem.paper_link}
                onRun={() => handleLaunchEval(evalItem.name)}
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