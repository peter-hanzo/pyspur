import FlowCanvas from '../components/canvas/FlowCanvas';
import Header from '../components/Header';
const WorkflowPage = () => {
  return (
    <div>
      <Header activePage="workflow" />
      <FlowCanvas />
    </div>
  );
};

export default WorkflowPage;
