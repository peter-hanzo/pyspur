import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FlowCanvas from '../../components/canvas/FlowCanvas';
import Header from '../../components/Header'; // Import the Header component
import { PersistGate } from 'redux-persist/integration/react'; // Import PersistGate
import { persistor } from '../../store/store'; // Import the persistor
import { getWorkflow, startRun } from '../../utils/api';

const WorkflowPage = () => {

    const router = useRouter();
    const { id } = router.query; // Access the dynamic route parameter
    const [workflowData, setWorkflowData] = useState(null);

    useEffect(() => {
        const fetchWorkflow = async () => {
            try {
                const data = await getWorkflow(id);
                console.log('Fetched workflow data:', data); // Add this line
                setWorkflowData(data);
            } catch (error) {
                console.error('Error fetching workflow:', error);
            }
        };

        if (id) {
            fetchWorkflow();
        }
    }, [id]);

    if (!workflowData) {
        return <div>Loading...</div>;
    }

    return (
        <PersistGate loading={null} persistor={persistor}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header activePage="workflow" style={{ position: 'sticky', top: 0, zIndex: 10 }} />
                <div style={{ flexGrow: 1 }}>
                    <FlowCanvas workflowData={workflowData} />
                </div>
            </div>
        </PersistGate>
    );
};

export default WorkflowPage;