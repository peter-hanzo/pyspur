import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  useReactFlow, // Add this import
} from 'reactflow'; // Import useReactFlow from reactflow
import 'reactflow/dist/style.css';
import { useSelector, useDispatch } from 'react-redux';
import TabbedFooter from './footer/TabbedFooter';
import Operator from './footer/operator/Operator';
import {
  nodesChange,
  edgesChange,
  connect,
  updateNodeData,
  setHoveredNode,
  setSelectedNode,
} from '../../store/flowSlice';
import Spreadsheet from '../table/Table';
import NodeDetails from '../nodes/NodeDetails';
import { Card, Button, Popover, PopoverTrigger, PopoverContent } from '@nextui-org/react';
import { getBezierPath } from 'reactflow';
import { RiAddCircleFill } from '@remixicon/react';
import DynamicNode from '../nodes/DynamicNode';
import { useNodeSelector } from '../../hooks/useNodeSelector';

const nodeTypes = {
  BasicLLMNode: (props) => <DynamicNode {...props} type="BasicLLMNode" />,
  StructuredOutputLLMNode: (props) => <DynamicNode {...props} type="StructuredOutputLLMNode" />,
  PythonFuncNode: (props) => <DynamicNode {...props} type="PythonFuncNode" />,
  // Add other node types here as needed
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
  source, // Add source node ID
  target, // Add target node ID
}) => {
  const { visible, setVisible, handleSelectNode } = useNodeSelector(); // Initialize the hook here

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });



  // Get the source and target nodes from the reactFlowInstance
  const reactFlowInstance = useReactFlow();
  const sourceNode = reactFlowInstance.getNode(source);
  const targetNode = reactFlowInstance.getNode(target);

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
            <Popover placement="bottom" showArrow={true} isOpen={visible} onOpenChange={setVisible}>
              <PopoverTrigger>
                <Button
                  auto
                  style={{ padding: 0, minWidth: 'auto' }}
                >
                  <RiAddCircleFill size={20} />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className='p-4 flex flex-col space-y-2'>
                  <div className='flex flex-col space-y-2'>
                    <h3 className='text-sm font-semibold'>Blocks</h3>
                    <Button auto light onClick={() => handleSelectNode('BasicLLMNode', sourceNode, targetNode)}>Basic LLM Node</Button>
                    <Button auto light onClick={() => handleSelectNode('StructuredOutputLLMNode', sourceNode, targetNode)}>Structured Output LLM Node</Button>
                    <Button auto light onClick={() => handleSelectNode('PythonFuncNode', sourceNode, targetNode)}>Python Function Node</Button>
                    <Button auto light onClick={() => handleSelectNode('LLM', sourceNode, targetNode)}>LLM</Button>
                    <Button auto light onClick={() => handleSelectNode('Knowledge Retrieval', sourceNode, targetNode)}>Knowledge Retrieval</Button>
                    <Button auto light onClick={() => handleSelectNode('End', sourceNode, targetNode)}>End</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
            <NodeDetails nodeID={selectedNodeID} />
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
