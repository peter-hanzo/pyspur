import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { Background, useReactFlow } from 'reactflow';
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
  deleteNode,
  addNode,
} from '../../store/flowSlice';
import Spreadsheet from '../table/Table';
import NodeDetails from '../nodes/NodeDetails';
import { Card, Button, Popover, PopoverContent } from '@nextui-org/react';
import { getBezierPath } from 'reactflow';
import { RiAddCircleFill } from '@remixicon/react';
import DynamicNode from '../nodes/DynamicNode';
import { v4 as uuidv4 } from 'uuid';
import { nodeTypes as nodeTypesConfig } from '../../constants/nodeTypes';
import { useNodeSelector } from '../../hooks/useNodeSelector';
import AddNodePopoverCanvasContent from './AddNodePopoverCanvas';
import { addNodeBetweenNodes } from './AddNodePopoverCanvas';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'; // Import the new hook

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
  const reactFlowInstance = useReactFlow();
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
                onPopoverOpen({ sourceNode, targetNode, edgeId: id }); // Pass the edgeId to onPopoverOpen
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
  const hoveredNode = useSelector((state) => state.flow.hoveredNode);
  const selectedNodeID = useSelector((state) => state.flow.selectedNode);

  // Manage reactFlowInstance locally
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

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

  const { visible, setVisible } = useNodeSelector(reactFlowInstance);

  const [hoveredEdge, setHoveredEdge] = useState(null); // Add state for hoveredEdge

  // State to manage the visibility of the PopoverContent and the selected edge
  const [isPopoverContentVisible, setPopoverContentVisible] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);

  const handlePopoverOpen = useCallback(({ sourceNode, targetNode, edgeId }) => {
    setSelectedEdge({ sourceNode, targetNode, edgeId });
    setPopoverContentVisible(true);
  }, []);

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

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance); // Set the instance locally
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

  const onNodesDelete = useCallback(
    (deletedNodes) => {
      deletedNodes.forEach((node) => {
        dispatch(deleteNode({ nodeId: node.id }));
      });
    },
    [dispatch]
  );

  // Use the custom hook for keyboard shortcuts
  useKeyboardShortcuts(selectedNodeID, nodes, dispatch);

  return (
    <div style={{ position: 'relative' }}>
      {isPopoverContentVisible && selectedEdge && (
        <Popover
          placement="bottom"
          showArrow={true}
          isOpen={isPopoverContentVisible}
          onOpenChange={setPopoverContentVisible}
        >
          <PopoverContent>
            <AddNodePopoverCanvasContent
              handleSelectNode={(nodeType) =>
                addNodeBetweenNodes(nodeType, selectedEdge.sourceNode, selectedEdge.targetNode, selectedEdge.edgeId, reactFlowInstance, dispatch, setVisible)
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
            onNodesDelete={onNodesDelete}
          >
            <Background />
            <Operator />
          </ReactFlow>
        </div>
        {selectedNodeID && (
          <div
            className="absolute top-0 right-0 h-full w-1/3 bg-white border-l border-gray-200"
            style={{ zIndex: 2 }}
          >
            <NodeDetails nodeID={selectedNodeID} />
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowCanvas;
