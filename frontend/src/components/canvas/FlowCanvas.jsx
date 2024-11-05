import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ReactFlow, Background, useReactFlow, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSelector, useDispatch } from 'react-redux';
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

import NodeSidebar from '../nodes/nodeSidebar/NodeSidebar';
import { Card, Button, Dropdown, DropdownMenu, DropdownTrigger, DropdownSection, DropdownItem } from '@nextui-org/react';
import DynamicNode from '../nodes/DynamicNode';
import { v4 as uuidv4 } from 'uuid';
import { nodeTypes as nodeTypesConfig } from '../../constants/nodeTypes';
import { addNodeBetweenNodes } from './AddNodePopoverCanvas';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'; // Import the new hook
import Header from '../Header';
import CustomEdge from './edges/CustomEdge';
import { getHelperLines } from '../../utils/helperLines';
import HelperLinesRenderer from '../HelperLines';
import useCopyPaste from '../../utils/useCopyPaste';
import GroupNode from '../nodes/GroupNode';
import { useGroupNodes } from '../../hooks/useGroupNodes';
import { useModeStore } from '../../store/modeStore';

console.log('Available nodeTypes:', nodeTypesConfig);

const nodeTypes = {
  group: GroupNode,
  ...Object.keys(nodeTypesConfig).reduce((acc, category) => {
    nodeTypesConfig[category].forEach(node => {
      console.log(`Registering node type: ${node.name}`);
      acc[node.name] = (props) => {
        console.log('Rendering node with props:', props);
        return <DynamicNode {...props} type={node.name} />;
      };
    });
    return acc;
  }, {})
};

console.log('Registered node types:', nodeTypes);

const edgeTypes = {
  custom: CustomEdge,
};

const FlowCanvas = () => {
  // console.log('FlowCanvas re-rendered');

  const dispatch = useDispatch();

  const nodes = useSelector((state) => state.flow.nodes);
  const edges = useSelector((state) => state.flow.edges);
  const hoveredNode = useSelector((state) => state.flow.hoveredNode);
  const selectedNodeID = useSelector((state) => state.flow.selectedNode);

  // Manage reactFlowInstance locally
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [helperLines, setHelperLines] = useState({ horizontal: null, vertical: null });

  const onNodesChange = useCallback(
    (changes) => {
      if (!changes.some((c) => c.type === 'position')) {
        setHelperLines({ horizontal: null, vertical: null });
        dispatch(nodesChange({ changes }));
        return;
      }

      const positionChange = changes.find(
        (c) => c.type === 'position' && c.position
      );

      if (positionChange) {
        const { horizontal, vertical } = getHelperLines(positionChange, nodes);
        setHelperLines({ horizontal, vertical });

        if (horizontal || vertical) {
          const snapPosition = { x: positionChange.position.x, y: positionChange.position.y };
          if (horizontal) snapPosition.y = horizontal;
          if (vertical) snapPosition.x = vertical;
          positionChange.position = snapPosition;
        }
      }

      dispatch(nodesChange({ changes }));
    },
    [dispatch, nodes]
  );

  const onEdgesChange = useCallback(
    (changes) => dispatch(edgesChange({ changes })),
    [dispatch]
  );
  const onConnect = useCallback(
    (connection) => {
      // Check if the target (input handle) already has a connection
      const isTargetConnected = edges.some(edge => edge.target === connection.target);
      // const targetNode = nodes.find(node => node.id === connection.target);
      // const targetField = connection.targetHandle;

      if (isTargetConnected) {
        // Prevent the connection and optionally show a message
        console.log("This input handle already has a connection.");
        return;
      }

      // Check if the target field has a user-provided input
      // const isFieldUserProvided = targetNode?.data?.config?.properties[targetField] !== undefined;

      // if (isFieldUserProvided) {
      //   console.log(`Connection to ${targetField} is disabled because it has a user-provided input.`);
      //   return;
      // }

      const newEdge = {
        ...connection,
        id: uuidv4(),
        key: uuidv4(),
      };
      dispatch(connect({ connection: newEdge }));
    },
    [dispatch, nodes, edges] // Add nodes to the dependency array
  );



  const [hoveredEdge, setHoveredEdge] = useState(null); // Add state for hoveredEdge

  // State to manage the visibility of the PopoverContent and the selected edge
  const [isPopoverContentVisible, setPopoverContentVisible] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);

  const handlePopoverOpen = useCallback(({ sourceNode, targetNode, edgeId }) => {
    setSelectedEdge({ sourceNode, targetNode, edgeId });
    setPopoverContentVisible(true);
  }, []);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      type: 'custom',
      style: {
        stroke: edge.id === hoveredEdge
          ? 'blue'
          : edge.source === hoveredNode || edge.target === hoveredNode
            ? 'red'
            : undefined,
        strokeWidth: edge.id === hoveredEdge
          ? 3
          : edge.source === hoveredNode || edge.target === hoveredNode
            ? 2
            : undefined,
      },
      data: {
        ...edge.data,
        showPlusButton: edge.id === hoveredEdge,
        onPopoverOpen: handlePopoverOpen,
      },
      key: edge.id,
    }));
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

  const onNodesDelete = useCallback(
    (deletedNodes) => {
      deletedNodes.forEach((node) => {
        dispatch(deleteNode({ nodeId: node.id }));

        if (selectedNodeID === node.id) {
          dispatch(setSelectedNode({ nodeId: null }));
        }
      });
    },
    [dispatch, selectedNodeID]
  );

  // Use the custom hook for keyboard shortcuts
  useKeyboardShortcuts(selectedNodeID, nodes, dispatch);

  const { cut, copy, paste, bufferedNodes } = useCopyPaste();

  const canCopy = nodes.some(({ selected }) => selected);
  const canPaste = bufferedNodes.length > 0;

  // Add this hook - it will handle the keyboard shortcuts automatically
  useCopyPaste();

  // Add proOptions configuration
  const proOptions = {
    hideAttribution: true
  };

  const { onGroup } = useGroupNodes();

  // Add keyboard shortcut for grouping
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault();
        onGroup();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onGroup]);

  // Get both mode and setMode from the store
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);

  // Create a memoized version of nodes with draggable property based on mode
  const nodesWithMode = useMemo(() => {
    console.log('Creating nodesWithMode with nodes:', nodes);
    return nodes.map(node => ({
      ...node,
      draggable: true,
      selectable: mode === 'pointer',
      position: node.position,
      type: node.type,
      data: node.data,
    }));
  }, [nodes, mode]);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {isPopoverContentVisible && selectedEdge && (
        <Dropdown
          isOpen={isPopoverContentVisible}
          onOpenChange={setPopoverContentVisible}
          placement="bottom"
        >
          <DropdownMenu>
            {Object.keys(nodeTypesConfig).map((category) => (
              <DropdownSection key={category} title={category} showDivider>
                {nodeTypesConfig[category].map((node) => (
                  <DropdownItem
                    key={node.name}
                    onClick={() =>
                      addNodeBetweenNodes(
                        node.name,
                        selectedEdge.sourceNode,
                        selectedEdge.targetNode,
                        selectedEdge.edgeId,
                        reactFlowInstance,
                        dispatch,
                        setPopoverContentVisible
                      )
                    }
                  >
                    {node.name}
                  </DropdownItem>
                ))}
              </DropdownSection>
            ))}
          </DropdownMenu>
        </Dropdown>
      )}

      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <div
          style={{
            height: `100%`,
            overflow: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <ReactFlow
            nodes={nodesWithMode}
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
            proOptions={proOptions}
            panOnDrag={mode === 'hand' && !nodes.some(n => n.selected)}
            panOnScroll={true}
            zoomOnScroll={true}
            selectionMode={mode === 'pointer' ? 1 : 0}
            selectNodesOnDrag={mode === 'pointer'}
            selectionOnDrag={mode === 'pointer'}
            selectionKeyCode={mode === 'pointer' ? null : false}
            multiSelectionKeyCode={mode === 'pointer' ? null : false}
            deleteKeyCode="Delete"
            nodesConnectable={mode === 'pointer'}
          >
            <Background />
            <HelperLinesRenderer
              horizontal={helperLines.horizontal}
              vertical={helperLines.vertical}
            />

            <Operator />
          </ReactFlow>
        </div>
        {selectedNodeID && (
          <div
            className="absolute top-0 right-0 h-full bg-white border-l border-gray-200"
            style={{ zIndex: 2 }}
          >
            <NodeSidebar nodeID={selectedNodeID} />
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowCanvas;
