import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSelector, useDispatch } from 'react-redux'; // Add this line
import TextFieldsNode from '../nodes/TextFieldsNode';
import LLMNode from '../nodes/LLMNode'; // Import your custom nodes
import TabbedFooter from './footer/TabbedFooter';
import Operator from './footer/operator/Operator'; // Adjust the path based on your file structure
import TextEditor from '../textEditor/TextEditor'; // Import your text editor component
import {
  nodesChange,
  edgesChange,
  connect,
  updateNodeData,
  setHoveredNode, // Import the setHoveredNode action
  setSelectedNode, // Import the setSelectedNode action
} from '../../store/flowSlice'; // Updated import path
import { Button, select } from '@nextui-org/react'; // Import NextUI Button component

// Remove the import of Toolbar
// import Toolbar from './header/Toolbar'; // Remove or comment out this line

const nodeTypes = {
  LLMNode: LLMNode,
  // ... other node types
};

const FlowCanvas = () => {
  const dispatch = useDispatch();

  const nodes = useSelector((state) => state.flow.nodes);
  const edges = useSelector((state) => state.flow.edges);
  const hoveredNode = useSelector((state) => state.flow.hoveredNode); // Get hoveredNode from state
  const selectedNodeID = useSelector((state) => state.flow.selectedNode); // Get selectedNodeID from state

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

  // Handle hover events
  const onNodeMouseEnter = useCallback(
    (event, node) => {
      dispatch(setHoveredNode({ nodeId: node.id })); // Set hovered node in Redux
    },
    [dispatch]
  );

  const onNodeMouseLeave = useCallback(() => {
    dispatch(setHoveredNode({ nodeId: null })); // Clear hovered node in Redux
  }, [dispatch]);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  // Handle node click to open text editor
  const onNodeClick = useCallback(
    (event, node) => {
      dispatch(setSelectedNode({ nodeId: node.id })); // Set the clicked node in Redux
    },
    [dispatch]
  );

  const onPaneClick = useCallback(() => {
    if (selectedNodeID) {
      dispatch(setSelectedNode({ nodeId: null })); // Clear selected node in Redux
    }
  }, [dispatch, selectedNodeID]);

  const footerHeight = 100; // Adjust this value to match your TabbedFooter's height

  return (
    <div style={{ position: 'relative' }}>
      {/* Remove the Toolbar component */}
      {/* <Toolbar /> */}

      <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
        <div
          style={{
            height: `calc(100% - ${footerHeight}px)`,
            overflow: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={styledEdges} // Use styledEdges
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            onInit={onInit}
            onNodeMouseEnter={onNodeMouseEnter} // Add event handler for hover enter
            onNodeMouseLeave={onNodeMouseLeave} // Add event handler for hover leave
            snapToGrid={true}          // Add this line to enable snapping
            snapGrid={[15, 15]}        // Add this line to set grid size (e.g., 15x15 pixels)
            onPaneClick={onPaneClick}  // Add event handler for pane click
            onNodeClick={onNodeClick}  // Add event handler for node click
          >
            <Background />
            <Operator />
          </ReactFlow>
        </div>
        {selectedNodeID && (
          // Render the component here 
          <div
            className="absolute top-0 right-0 h-full w-1/3 bg-white border-l border-gray-200"
            style={{ zIndex: 2 }}
          >
            <TextEditor nodeID={selectedNodeID} />
          </div>
        )}
        <div style={{ height: `${footerHeight}px` }}>
          <TabbedFooter />
        </div>
      </div>
    </div>
  );
};

export default FlowCanvas;
