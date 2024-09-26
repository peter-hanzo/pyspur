
import React, { useState, useEffect } from 'react';
import ReactFlow, { addEdge, MiniMap, Controls } from 'react-flow-renderer';
import { getNodes } from '../services/nodeService';
import TextEditor from '../components/textEditor';
import Table from '../components/table';

const Home = () => {
  const [nodeTypes, setNodeTypes] = useState({});
  const [elements, setElements] = useState([]);

  useEffect(() => {
    getNodes().then((nodes) => {
      // Process nodes to create custom node types if necessary
      setNodeTypes(nodes);
    });
  }, []);

  const onConnect = (params) => setElements((els) => addEdge(params, els));

  return (
    <div className="App">
      <div>Welcome to Next.js!</div>
      <ReactFlow
        elements={elements}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        style={{ width: '100%', height: '90vh' }}
      >
        <MiniMap />
        <Controls />
      </ReactFlow>
      <TextEditor />
      <Table />
    </div>
  );
};

export default Home;