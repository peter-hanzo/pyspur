import FlowCanvas from '../components/canvas/FlowCanvas';
import Header from '../components/Header';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor } from '../store/store';
import RunModal from '../components/RunModal';

const WorkflowPage = () => {
  const handleSave = (inputValues) => {
    // Implement the save logic here
    console.log('Saving input values:', inputValues);
  };

  return (
    <PersistGate loading={null} persistor={persistor}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header activePage="workflow" style={{ position: 'sticky', top: 0, zIndex: 10 }} />
        <div style={{ flexGrow: 1 }}>
          <FlowCanvas />
        </div>
        <RunModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          onRun={handleRun}
          onSave={handleSave}
        />
      </div>
    </PersistGate>
  );
};

export default WorkflowPage;
