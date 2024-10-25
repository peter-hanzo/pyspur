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
  setReactFlowInstance, // Import the action
  deleteNode, // Import the deleteNode action
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
import NodePopoverContent from './footer/operator/NodePopoverContent'; // Import the new component
import { addNodeBetweenNodes } from './footer/operator/NodePopoverContent';

const nodeTypes = {};
Object.keys(nodeTypesConfig).forEach(category => {
  nodeTypesConfig[category].forEach(node => {
    nodeTypes[node.name] = (props) => <DynamicNode {...props} type={node.name} />;
  });
});

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
  source,
  target,
}) => {

  const { onPopoverOpen, showPlusButton } = data; // Destructure from data
  const reactFlowInstance = useSelector((state) => state.flow.reactFlowInstance); // Use reactFlowInstance from Redux

  const sourceNode = reactFlowInstance.getNode(source);
  const targetNode = reactFlowInstance.getNode(target);

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
      {showPlusButton && (
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
              style={{
                padding: 0,
                minWidth: 'auto',
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
              }}
              onClick={() => {
                onPopoverOpen({ sourceNode, targetNode }); // Now this works!
              }}
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
  const reactFlowInstance = useSelector((state) => state.flow.reactFlowInstance); // Get reactFlowInstance from Redux

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

  const { visible, setVisible } = useNodeSelector(reactFlowInstance); // Use reactFlowInstance from Redux

  // Adding new state to manage active tab and spreadsheet data
  const [activeTab, setActiveTab] = useState('sheet1'); // Manage active tab state
  const [spreadsheetData, setSpreadsheetData] = useState([[""]]); // Store spreadsheet data

  const [hoveredEdge, setHoveredEdge] = useState(null); // Add state for hoveredEdge

  // State to manage the visibility of the PopoverContent and the selected edge
  const [isPopoverContentVisible, setPopoverContentVisible] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null); // Track the selected edge


  // Function to handle the visibility of the PopoverContent
  const handlePopoverOpen = useCallback(({ sourceNode, targetNode }) => {
    setSelectedEdge({ sourceNode, targetNode });
    setPopoverContentVisible(true);
  }, []);

  // Ensure handlePopoverOpen is defined before styledEdges
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const isHovered = edge.id === hoveredEdge;
      return {
        ...edge,
        type: 'custom',
        style: {
          stroke: isHovered
            ? 'blue'
            : edge.source === hoveredNode || edge.target === hoveredNode
              ? 'red'
              : undefined,
          strokeWidth: isHovered
            ? 3
            : edge.source === hoveredNode || edge.target === hoveredNode
              ? 2
              : undefined,
        },
        data: {
          ...edge.data,
          showPlusButton: isHovered,
          onPopoverOpen: handlePopoverOpen,
        },
        key: edge.id,
      };
    });
  }, [edges, hoveredNode, hoveredEdge, handlePopoverOpen]);

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

  // Function to handle the initialization of ReactFlow instance
  const onInit = useCallback((instance) => {
    dispatch(setReactFlowInstance({ instance })); // Dispatch the instance to Redux
  }, [dispatch]);

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

  const handleSelectNode = (nodeType, sourceNode, targetNode) => {
    // Logic to handle node selection in FlowCanvas
    console.log(`Selected node type: ${nodeType}, source: ${sourceNode.id}, target: ${targetNode.id}`);
    setPopoverContentVisible(false);
  };

  // Handle node deletion from React Flow
  const onNodesDelete = useCallback(
    (deletedNodes) => {
      deletedNodes.forEach((node) => {
        dispatch(deleteNode({ nodeId: node.id })); // Dispatch deleteNode for each deleted node
      });
    },
    [dispatch]
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* Popover component moved here */}
      {isPopoverContentVisible && selectedEdge && (
        <Popover
          placement="bottom"
          showArrow={true}
          isOpen={isPopoverContentVisible}
          onOpenChange={setPopoverContentVisible}
        >
          <PopoverContent>
            <NodePopoverContent
              handleSelectNode={(nodeType) =>
                addNodeBetweenNodes(nodeType, selectedEdge.sourceNode, selectedEdge.targetNode, reactFlowInstance, dispatch, setVisible)
              }
            />
          </PopoverContent>
        </Popover>
      )}

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
              onNodesDelete={onNodesDelete} // Add the onNodesDelete callback
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
