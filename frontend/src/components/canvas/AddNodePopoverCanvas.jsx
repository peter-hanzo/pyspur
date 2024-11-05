import React, { useState } from 'react';
import { Button } from '@nextui-org/react';
import { nodeTypes } from '../../constants/nodeTypes';
import { addNode, connect, deleteEdge } from '../../store/flowSlice';
import { createNode } from '../nodes/nodeFactory';
import { DropdownSection, DropdownItem } from '@nextui-org/react';

export const addNodeWithoutConnection = (nodeType, reactFlowInstance, dispatch) => {
  const id = `node_${Date.now()}`;
  const center = reactFlowInstance.screenToFlowPosition({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  const position = {
    x: center.x,
    y: center.y,
  };

  const newNode = createNode(nodeType, id, position);
  dispatch(addNode({ node: newNode }));
};

export const addNodeBetweenNodes = (nodeType, sourceNode, targetNode, edgeId, reactFlowInstance, dispatch, setVisible) => {
  const id = `node_${Date.now()}`;
  const newPosition = {
    x: (sourceNode.position.x + targetNode.position.x) / 2,
    y: (sourceNode.position.y + targetNode.position.y) / 2,
  };

  const newNode = createNode(nodeType, id, newPosition);

  dispatch(deleteEdge({ edgeId }));
  dispatch(addNode({ node: newNode }));
  dispatch(connect({ connection: { source: sourceNode.id, target: newNode.id } }));
  dispatch(connect({ connection: { source: newNode.id, target: targetNode.id } }));

  setVisible(false);
};
