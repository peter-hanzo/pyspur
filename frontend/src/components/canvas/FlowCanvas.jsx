import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSelector, useDispatch } from 'react-redux'; // Add this line
import LLMNode from '../nodes/LLMNode/LLMNode'; // Import your custom nodes
import TabbedFooter from './footer/TabbedFooter';
import Operator from './footer/operator/Operator'; // Adjust the path based on your file structure
import {
  nodesChange,
  edgesChange,
  connect,
  updateNodeData,
  setHoveredNode, // Import the setHoveredNode action
  setSelectedNode, // Import the setSelectedNode action
} from '../../store/flowSlice'; // Updated import path
import Spreadsheet from '../table/Table'; // Import the Spreadsheet component
import LLMNodeDetails from '../nodes/LLMNode/LLMNodeDetails'; // Import the LLMNodeDetails component
import { Card, Button } from '@nextui-org/react'; // Import NextUI components
import { getBezierPath } from 'reactflow'; // Import helper for custom edge
import { RiAddCircleFill } from '@remixicon/react';

const nodeTypes = {
  LLMNode: LLMNode,
  // ... other node types
};

// Custom edge component
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Visible edge path */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
      />
      {/* Invisible path to increase hover area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30} // Increased strokeWidth for better sensitivity
        style={{ pointerEvents: 'stroke' }}
        className="react-flow__edge-hover"
      />
      {data.showPlusButton && (
        <foreignObject
          width={30}
          height={30}
          x={labelX - 15}
          y={labelY - 15}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              pointerEvents: 'all',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <Button
              auto
              onClick={() => console.log('Plus button clicked')}
              style={{ padding: 0, minWidth: 'auto' }}
            >
              <RiAddCircleFill size={20} />
            </Button>
          </div>
        </foreignObject>
      )}
    </>
  );
};

// Update nodeTypes to include the custom edge
const edgeTypes = {
  custom: CustomEdge,
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

  // Adding new state to manage active tab and spreadsheet data
  const [activeTab, setActiveTab] = useState('sheet1'); // Manage active tab state
  const [spreadsheetData, setSpreadsheetData] = useState([[""]]); // Store spreadsheet data

  const [hoveredEdge, setHoveredEdge] = useState(null); // Add state for hoveredEdge

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const isHovered = edge.id === hoveredEdge;
      return {
        ...edge,
        type: 'custom', // Use custom edge type
        style: {
          stroke: isHovered ? 'blue' : edge.source === hoveredNode || edge.target === hoveredNode ? 'red' : undefined,
          strokeWidth: isHovered ? 3 : edge.source === hoveredNode || edge.target === hoveredNode ? 2 : undefined,
        },
        data: {
          ...edge.data,
          showPlusButton: isHovered, // Add flag to show + button
        },
      };
    });
  }, [edges, hoveredNode, hoveredEdge]);

  // Define edge hover event handlers
  const onEdgeMouseEnter = useCallback(
    (event, edge) => {
      setHoveredEdge(edge.id); // Set hovered edge
    },
    []
  );

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdge(null); // Clear hovered edge
  }, []);

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
      <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
        <div
          style={{
            height: `calc(100% - ${footerHeight}px)`,
            overflow: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {activeTab === 'sheet1' ? (
            <ReactFlow
              nodes={nodes}
              edges={styledEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes} // Add edgeTypes to ReactFlow
              fitView
              onInit={onInit}
              onNodeMouseEnter={onNodeMouseEnter}
              onNodeMouseLeave={onNodeMouseLeave}
              snapToGrid={true}
              snapGrid={[15, 15]}
              onPaneClick={onPaneClick}
              onNodeClick={onNodeClick}
              onEdgeMouseEnter={onEdgeMouseEnter}
              onEdgeMouseLeave={onEdgeMouseLeave}
            >
              <Background />
              <Operator />
            </ReactFlow>
          ) : (
            <Spreadsheet initialData={spreadsheetData} onDataUpdate={setSpreadsheetData} />
          )}
        </div>
        {activeTab === 'sheet1' && selectedNodeID && (
          <div
            className="absolute top-0 right-0 h-full w-1/3 bg-white border-l border-gray-200"
            style={{ zIndex: 2 }}
          >
            <LLMNodeDetails nodeID={selectedNodeID} />
          </div>
        )}
        <div style={{ height: `${footerHeight}px` }}>
          <TabbedFooter activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </div>
  );
};

export default FlowCanvas;