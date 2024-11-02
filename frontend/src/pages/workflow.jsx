import FlowCanvas from '../components/canvas/FlowCanvas';
import Header from '../components/Header';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor } from '../store/store';

const WorkflowPage = () => {
  return (
    <PersistGate loading={null} persistor={persistor}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header activePage="workflow" style={{ position: 'sticky', top: 0, zIndex: 10 }} />
        <div style={{ flexGrow: 1 }}>
          <FlowCanvas />
        </div>
      </div>
    </PersistGate>
  );
};

export default WorkflowPage;
