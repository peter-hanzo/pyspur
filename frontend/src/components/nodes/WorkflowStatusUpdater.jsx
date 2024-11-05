import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData } from '../../../store/flowSlice';
import { getRunStatus } from '../../../utils/api';

const WorkflowStatusUpdater = ({ runID }) => {
    const dispatch = useDispatch();
    const nodes = useSelector((state) => state.flow.nodes);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await getRunStatus(runID);
                const outputs = response.outputs;
    
                // Iterate over the outputs from the backend
                for (const [nodeId, nodeStatus] of Object.entries(outputs)) {
                    dispatch(updateNodeData({
                        id: nodeId,
                        data: { status: nodeStatus.status, runoutput: nodeStatus.output }
                    }));
                }
            } catch (error) {
                console.error('Error fetching workflow status:', error);
            }
        }, 1000);
    
        return () => clearInterval(interval);
    }, [runID, dispatch]);

    return null; // This component doesn't render anything
};

export default WorkflowStatusUpdater;