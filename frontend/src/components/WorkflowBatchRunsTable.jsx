import React, { useState, useEffect } from 'react';
import { getKeyValue, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Progress } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { getAllRuns, downloadOutputFile } from '../utils/api';

const WorkflowBatchRunsTable = () => {
  const [workflowBatchRuns, setWorkflowBatchRuns] = useState([]);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const runs = await getAllRuns();
        const formattedRuns = runs.map(run => ({
          key: run.id,
          id: run.id,
          workflow_name: run.workflow.name,
          dataset: run.input_dataset_id || 'N/A',
          progress: run.status === 'COMPLETED' ? 100 : run.status === 'FAILED' ? 0 : 50,
          output_file_id: run.output_file_id,
        }));
        setWorkflowBatchRuns(formattedRuns);
      } catch (error) {
        console.error('Error fetching runs:', error);
      }
    };

    fetchRuns();
    const intervalId = setInterval(fetchRuns, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  const activeColumns = [
    { key: "id", label: "RUN ID" },
    { key: "workflow_name", label: "WORKFLOW" },
    { key: "dataset", label: "DATASET" },
    { key: "progress", label: "STATUS" },
    { key: "download", label: "DOWNLOAD" },
  ];

  const handleDownload = (batch_run) => {
    downloadOutputFile(batch_run.output_file_id);
  };

  return (
    <>
      <h3 className="text-xl font-semibold mt-8 mb-4">Workflow Jobs</h3>
      <Table aria-label="Workflow Jobs" isHeaderSticky>
        <TableHeader columns={activeColumns}>
          {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
        </TableHeader>
        <TableBody items={workflowBatchRuns}>
          {(batch_run) => (
            <TableRow key={batch_run.key}>
              {(columnKey) => (
                <TableCell>
                  {columnKey === "progress" ? (
                    batch_run.progress === 100 ? (
                      <span className="text-success">Finished</span>
                    ) : (
                      <Progress value={batch_run.progress} />
                    )
                  ) : columnKey === "download" ? (
                    batch_run.progress === 100 ? (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => handleDownload(batch_run)}
                      >
                        <Icon
                          icon="solar:download-linear"
                          className="text-default-400"
                          width={20}
                        />
                      </Button>
                    ) : null
                  ) : (
                    getKeyValue(batch_run, columnKey)
                  )}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
};

export default WorkflowBatchRunsTable;