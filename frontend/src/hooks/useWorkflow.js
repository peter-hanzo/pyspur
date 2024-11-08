// frontend/src/hooks/useWorkflow.js
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRunStatus, startRun, getWorkflow } from '../utils/api';
import { updateNodeData, clearCanvas, setProjectName } from '../store/flowSlice';

const useWorkflow = () => {
    const dispatch = useDispatch();
    const nodes = useSelector((state) => state.flow.nodes);
    const workflowID = useSelector((state) => state.flow.workflowID);
    const inputNodeValues = useSelector((state) => state.flow.inputNodeValues);
    const projectName = useSelector((state) => state.flow.projectName);
    const [isRunning, setIsRunning] = useState(false);

    const updateWorkflowStatus = async (runID) => {
        const checkStatusInterval = setInterval(async () => {
            try {
                const statusResponse = await getRunStatus(runID);
                const outputs = statusResponse.outputs;
                console.log('Status Response:', statusResponse);

                if (outputs) {
                    Object.entries(outputs).forEach(([nodeId, data]) => {
                        const node = nodes.find((node) => node.id === nodeId);
                        if (data) {
                            dispatch(updateNodeData({ id: nodeId, data: { run: { ...node.data.run, ...data } } }));
                        }
                    });
                }

                if (statusResponse.status !== 'RUNNING') {
                    setIsRunning(false);
                    clearInterval(checkStatusInterval);
                }
            } catch (error) {
                console.error('Error fetching workflow status:', error);
                clearInterval(checkStatusInterval);
            }
        }, 10000);
    };

    const handleRunWorkflow = async () => {
        try {
            console.log('Input Node Values:', inputNodeValues);
            const test_inputs = {
                "initial_inputs": {
                    "node_1731066766087": { "user_message": "Give me weather in London" }
                }
            };
            const result = await startRun(workflowID, test_inputs, null, 'interactive');

            setIsRunning(true);
            updateWorkflowStatus(result.id);

        } catch (error) {
            console.error('Error starting workflow run:', error);
        }
    };

    const handleDownloadWorkflow = async () => {
        try {
            const workflow = await getWorkflow(workflowID);
            const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName.replace(/\s+/g, '_')}.json`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading workflow:', error);
        }
    };

    return {
        isRunning,
        handleRunWorkflow,
        handleDownloadWorkflow,
        handleClearCanvas: () => {
            if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
                dispatch(clearCanvas());
            }
        },
        handleProjectNameChange: (e) => {
            dispatch(setProjectName(e.target.value));
        }
    };
};

export default useWorkflow;