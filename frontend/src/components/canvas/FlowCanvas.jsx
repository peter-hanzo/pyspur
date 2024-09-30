import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSelector, useDispatch } from 'react-redux'; // Add this line
import TextFieldsNode from '../nodes/TextFieldsNode';
import LLMNode from '../nodes/LLMNode';
import Operator from './footer/operator/Operator'; // Adjust the path based on your file structure
import {
  nodesChange,
  edgesChange,
  connect,
  updateNodeData,
} from '../../store/flowSlice'; // Updated import path

const nodeTypes = {
  textfields: TextFieldsNode,
  llmnode: LLMNode,
};

const FlowCanvas = () => {
  const dispatch = useDispatch();

  const nodes = useSelector((state) => state.flow.nodes);
  const edges = useSelector((state) => state.flow.edges);
  const hoveredNode = useSelector((state) => state.flow.hoveredNode);

  const onNodesChange = useCallback(
    (changes) => dispatch(nodesChange({ changes })),
    [dispatch]
  );
  const onEdgesChange = useCallback(
    (changes) => dispatch(edgesChange({ changes })),
    [dispatch]
  );
  const onConnect = useCallback(
    (connection) => dispatch(connect({ connection })),
    [dispatch]
  );
  const onUpdateNodeData = useCallback(
    (id, data) => dispatch(updateNodeData({ id, data })),
    [dispatch]
  );

  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      if (edge.source === hoveredNode || edge.target === hoveredNode) {
        return {
          ...edge,
          style: { stroke: 'red', strokeWidth: 2 }, // Highlighted edge style
        };
      }
      return edge;
    });
  }, [edges, hoveredNode]);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);


  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div style={{ width: '100%', height: 'calc(100vh - 60px)' }}>

        <div style={{ width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            onInit={onInit}
          >
            <Background />

            <Operator />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default FlowCanvas;
