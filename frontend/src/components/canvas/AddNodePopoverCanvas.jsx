import React, { useState } from 'react';
import { Button } from '@nextui-org/react';
import { nodeTypes } from '../../constants/nodeTypes'; // Import nodeTypes
import { addNode, connect, deleteEdge } from '../../store/flowSlice';
import { createNode } from '../nodes/nodeFactory'; // Import createNode
import { DropdownSection, DropdownItem } from '@nextui-org/react';

// Refactored handleSelectNode function
export const addNodeWithoutConnection = (nodeType, reactFlowInstance, dispatch) => {
  // console.log('addNodeWithoutConnection', nodeType, reactFlowInstance, dispatch);
  const id = `${reactFlowInstance.getNodes().length + 1}`;
  const position = reactFlowInstance.screenToFlowPosition({ x: 250, y: 5 });

  // Use createNode from nodeFactory.js
  const newNode = createNode(nodeType, id, position);

  dispatch(addNode({ node: newNode }));
};

// Function to add a node between two existing nodes and delete the existing edge
export const addNodeBetweenNodes = (nodeType, sourceNode, targetNode, edgeId, reactFlowInstance, dispatch, setVisible) => {
  const id = `${reactFlowInstance.getNodes().length + 1}`;
  const newPosition = reactFlowInstance.screenToFlowPosition({
    x: (sourceNode.position.x + targetNode.position.x) / 2,
    y: (sourceNode.position.y + targetNode.position.y) / 2,
  });

  // Use createNode from nodeFactory.js
  const newNode = createNode(nodeType, id, newPosition);

  dispatch(deleteEdge({ edgeId }));
  dispatch(addNode({ node: newNode }));
  dispatch(connect({ connection: { source: sourceNode.id, target: newNode.id } }));
  dispatch(connect({ connection: { source: newNode.id, target: targetNode.id } }));

  setVisible(false);
};
