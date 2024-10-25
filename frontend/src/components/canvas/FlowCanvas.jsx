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
import { v4 as uuidv4 } from 'uuid';
import { nodeTypes as nodeTypesConfig } from '../../constants/nodeTypes'; // Import nodeTypes
import { useNodeSelector } from '../../hooks/useNodeSelector';

// Create a mapping of node types for ReactFlow
const nodeTypes = {};
Object.keys(nodeTypesConfig).forEach(category => {
  nodeTypesConfig[category].forEach(node => {
    nodeTypes[node.name] = (props) => <DynamicNode {...props} type={node.name} />;
  });
});

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
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
      />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
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
  const hoveredNode = useSelector((state) => state.flow.hoveredNode);
  const selectedNodeID = useSelector((state) => state.flow.selectedNode);

  const onNodesChange = useCallback(
    (changes) => dispatch(nodesChange({ changes })),
    [dispatch]
  );
  const onEdgesChange = useCallback(
    (changes) => dispatch(edgesChange({ changes })),
    [dispatch]
  );
  const onConnect = useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        id: uuidv4(),
        key: uuidv4(),
      };
      dispatch(connect({ connection: newEdge }));
    },
    [dispatch]
  );
  const onUpdateNodeData = useCallback(
    (id, data) => dispatch(updateNodeData({ id, data })),
    [dispatch]
  );

  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [activeTab, setActiveTab] = useState('sheet1');
  const [spreadsheetData, setSpreadsheetData] = useState([[""]]);

  const [hoveredEdge, setHoveredEdge] = useState(null);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const isHovered = edge.id === hoveredEdge;
      return {
        ...edge,
        type: 'custom',
        style: {
          stroke: isHovered ? 'blue' : edge.source === hoveredNode || edge.target === hoveredNode ? 'red' : undefined,
          strokeWidth: isHovered ? 3 : edge.source === hoveredNode || edge.target === hoveredNode ? 2 : undefined,
        },
        data: {
          ...edge.data,
          showPlusButton: isHovered,
        },
        key: edge.id,
      };
    });
  }, [edges, hoveredNode, hoveredEdge]);

  const onEdgeMouseEnter = useCallback(
    (event, edge) => {
      setHoveredEdge(edge.id);
    },
    []
  );

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdge(null);
  }, []);

  const onNodeMouseEnter = useCallback(
    (event, node) => {
      dispatch(setHoveredNode({ nodeId: node.id }));
    },
    [dispatch]
  );

  const onNodeMouseLeave = useCallback(() => {
    dispatch(setHoveredNode({ nodeId: null }));
  }, [dispatch]);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  const onNodeClick = useCallback(
    (event, node) => {
      dispatch(setSelectedNode({ nodeId: node.id }));
    },
    [dispatch]
  );

  const onPaneClick = useCallback(() => {
    if (selectedNodeID) {
      dispatch(setSelectedNode({ nodeId: null }));
    }
  }, [dispatch, selectedNodeID]);

  const footerHeight = 100;

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
              edgeTypes={edgeTypes}
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
