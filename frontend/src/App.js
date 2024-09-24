import React, { useState, useEffect } from 'react';
import ReactFlow, { addEdge, MiniMap, Controls } from 'react-flow-renderer';
import { getNodes } from './services/nodeService';

function App() {
  const [nodeTypes, setNodeTypes] = useState({});
  const [elements, setElements] = useState([]);

  useEffect(() => {
    getNodes().then((nodes) => {
      // Process nodes to create custom node types if necessary
      // For simplicity, we'll assume nodes are standard types
      setNodeTypes(nodes);
    });
  }, []);

  const onConnect = (params) => setElements((els) => addEdge(params, els));

  return (
    <ReactFlow
      elements={elements}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      style={{ width: '100%', height: '90vh' }}
    >
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}

export default App;
