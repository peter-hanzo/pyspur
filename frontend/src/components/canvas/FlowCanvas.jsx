import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ReactFlow, Background, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSelector, useDispatch } from 'react-redux';
import Operator from './footer/operator/Operator';
import NodeSidebar from '../nodes/nodeSidebar/NodeSidebar';
import { Dropdown, DropdownMenu, DropdownSection, DropdownItem } from '@nextui-org/react';
import DynamicNode from '../nodes/DynamicNode';
import { v4 as uuidv4 } from 'uuid';
import { addNodeBetweenNodes } from './AddNodePopoverCanvas';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CustomEdge from './edges/CustomEdge';
import { getHelperLines } from '../../utils/helperLines';
import HelperLinesRenderer from '../HelperLines';
import useCopyPaste from '../../utils/useCopyPaste';
import { useModeStore } from '../../store/modeStore';
import InputNode from '../nodes/InputNode';
import { useSaveWorkflow } from '../../hooks/useSaveWorkflow';
import LoadingSpinner from '../LoadingSpinner';
import useWorkflow from '../../hooks/useWorkflow';

const edgeTypes = {
  custom: CustomEdge,
};

const FlowCanvasContent = (props) => {
  const { workflowData, workflowID } = props;

  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,
    onNodeMouseEnter,
    onNodeMouseLeave,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onNodeClick,
    onPaneClick,
    selectedNodeID, 
    styledEdges,
    edgeUpdateTrigger,
    isPopoverContentVisible,
    popoverPosition,
    setPopoverContentVisible,
    nodeTypesConfig: workflowNodeTypesConfig,
  } = useWorkflow(workflowID, workflowData);

  const nodeTypesConfig = useSelector((state) => state.nodeTypes.data);
  const createNodeTypes = useCallback(() => {
    if (!nodeTypesConfig) return {};
    return Object.keys(nodeTypesConfig).reduce((acc, category) => {
      nodeTypesConfig[category].forEach(node_type => {
        if (node_type.name === 'InputNode') {
          acc[node_type.name] = InputNode;
        } else {
          acc[node_type.name] = (props) => (
            <DynamicNode
              id={props.id}
              nodeTypeConfig={props.data}
              position={props.position}
            />
          );
        }
      });
      return acc;
    }, {});
  }, [nodeTypesConfig]);
  
  const nodeTypes = useMemo(() => createNodeTypes(), [createNodeTypes]);

  const [helperLines, setHelperLines] = useState({ horizontal: null, vertical: null });

  const showHelperLines = false;

  const [hoveredEdge, setHoveredEdge] = useState(null);

  const [selectedEdge, setSelectedEdge] = useState(null);


  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
    instance.setViewport({ x: 0, y: 0, zoom: 0.8 });
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter(node => node.selected);
        if (selectedNodes.length > 0) {
          onNodesDelete(selectedNodes);
        }
      }
    },
    [nodes, onNodesDelete]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useKeyboardShortcuts(selectedNodeID, nodes, dispatch);

  const { cut, copy, paste, bufferedNodes } = useCopyPaste();

  useCopyPaste();

  const proOptions = {
    hideAttribution: true
  };

  const mode = useModeStore((state) => state.mode);

  const nodesWithMode = useMemo(() => {
    if (!nodes) return [];
    return nodes
      .filter(Boolean)
      .map(node => ({
        ...node,
        draggable: true,
        selectable: mode === 'pointer',
        position: node?.position,
        type: node?.type,
        data: node?.data,
      }));
  }, [nodes, mode]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {isPopoverContentVisible && selectedEdge && (
        <div
          style={{
            position: 'absolute',
            left: `${popoverPosition.x}px`,
            top: `${popoverPosition.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
          }}
        >
          <Dropdown
            isOpen={isPopoverContentVisible}
            onOpenChange={setPopoverContentVisible}
            placement="bottom"
          >
            <DropdownMenu>
              {Object.keys(workflowNodeTypesConfig).map((category) => (
                <DropdownSection key={category} title={category} showDivider>
                  {workflowNodeTypesConfig[category].map((node) => (
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
        </div>
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
            panOnDrag={mode === 'hand' && !nodes?.filter(Boolean).some(n => n.selected)}
            panOnScroll={true}
            zoomOnScroll={true}
            minZoom={0.1}
            maxZoom={2}
            selectionMode={mode === 'pointer' ? 1 : 0}
            selectNodesOnDrag={mode === 'pointer'}
            selectionOnDrag={mode === 'pointer'}
            selectionKeyCode={mode === 'pointer' ? null : false}
            multiSelectionKeyCode={mode === 'pointer' ? null : false}
            deleteKeyCode="Delete"
            nodesConnectable={true}
            connectionMode="loose"
            key={edgeUpdateTrigger}            >
            <Background />

            {showHelperLines && (
              <HelperLinesRenderer
                horizontal={helperLines.horizontal}
                vertical={helperLines.vertical}
              />
            )}

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

const FlowCanvas = ({ workflowData, workflowID }) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasContent workflowData={workflowData} workflowID={workflowID} />
    </ReactFlowProvider>
  );
};

export default FlowCanvas;
