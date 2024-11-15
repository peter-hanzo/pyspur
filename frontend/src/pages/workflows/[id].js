import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FlowCanvas from '../../components/canvas/FlowCanvas';
import Header from '../../components/Header'; // Import the Header component
import { PersistGate } from 'redux-persist/integration/react'; // Import PersistGate
import { persistor } from '../../store/store'; // Import the persistor
import { getWorkflow } from '../../utils/api';
import { useDispatch, useSelector } from 'react-redux'; // Import useDispatch from react-redux
import { fetchNodeTypes } from '../../store/nodeTypesSlice'; // Import fetchNodeTypes

import LoadingSpinner from '../../components/LoadingSpinner';
import useWorkflow from '../../hooks/useWorkflow';
import { initializeFlow, setWorkflowInputVariable } from '../../store/flowSlice';

const WorkflowPage = () => {

    const dispatch = useDispatch(); // Initialize dispatch
    const router = useRouter();
    const { id } = router.query; // Access the dynamic route parameter
    const [workflowData, setWorkflowData] = useState(null);
    const [initialized, setInitialized] = useState(false);

    const initializeWorkflowData = (workflowID, workflowData, nodeTypesConfig, dispatch) => {
        console.log('workflowData', workflowData);
        dispatch(initializeFlow({ nodeTypes: nodeTypesConfig, ...workflowData, workflowID }));
    };

    const nodeTypesConfig = useSelector((state) => state.nodeTypes.data);

    useEffect(() => {
        dispatch(fetchNodeTypes());
    }, [dispatch]);

    useEffect(() => {
        const fetchWorkflow = async () => {
            try {
                const data = await getWorkflow(id);
                setWorkflowData(data);
            } catch (error) {
                console.error('Error fetching workflow:', error);
            }
        };

        if (id) {
            fetchWorkflow();
        }
    }, [id]);

    useEffect(() => {
        if (workflowData && nodeTypesConfig) {
            initializeWorkflowData(id, workflowData, nodeTypesConfig, dispatch);
            setInitialized(true);
        }
    }, [workflowData, nodeTypesConfig, id, dispatch]);


    if (!initialized) {
        return <LoadingSpinner />;
    }

    return (
        <PersistGate loading={null} persistor={persistor}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header activePage="workflow" style={{ position: 'sticky', top: 0, zIndex: 10 }} />
                <div style={{ flexGrow: 1 }}>
                    <FlowCanvas workflowData={workflowData} workflowID={id} />
                </div>
            </div>
        </PersistGate>
    );
};

export default WorkflowPage;