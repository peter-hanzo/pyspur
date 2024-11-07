import React from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Progress } from '@nextui-org/react';
import { Icon } from '@iconify/react';

const WorkflowBatchRunsTable = ({ activeColumns, workflowJobs, handleDownload, getKeyValue }) => {
  return (
    <>
      <h3 className="text-xl font-semibold mt-8 mb-4">Workflow Jobs</h3>
      <Table aria-label="Workflow Jobs" isHeaderSticky>
        <TableHeader columns={activeColumns}>
          {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
        </TableHeader>
        <TableBody items={workflowJobs}>
          {(workflow) => (
            <TableRow key={workflow.key}>
              {(columnKey) => (
                <TableCell>
                  {columnKey === "progress" ? (
                    workflow.progress === 100 ? (
                      <span className="text-success">Finished</span>
                    ) : (
                      <Progress value={workflow.progress} />
                    )
                  ) : columnKey === "download" ? (
                    workflow.progress === 100 ? (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => handleDownload(workflow)}
                      >
                        <Icon
                          icon="solar:download-linear"
                          className="text-default-400"
                          width={20}
                        />
                      </Button>
                    ) : null
                  ) : (
                    getKeyValue(workflow, columnKey)
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