import FlowCanvas from '../components/canvas/FlowCanvas';
import Header from '../components/Header';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor } from '../store/store';

const WorkflowPage = () => {
  return (
    <PersistGate loading={null} persistor={persistor}>
      <div>
        <Header activePage="workflow" />
        <FlowCanvas />
      </div>
    </PersistGate>
  );
};

export default WorkflowPage;
