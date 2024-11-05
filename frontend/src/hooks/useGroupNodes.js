import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { setNodes } from '../store/flowSlice';

export const useGroupNodes = () => {
  const dispatch = useDispatch();
  const nodes = useSelector(state => state.flow.nodes);

  const onGroup = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);

    if (selectedNodes.length < 2) return;

    // Calculate the bounding box of selected nodes
    const bounds = selectedNodes.reduce(
      (acc, node) => {
        const nodeLeft = node.position.x;
        const nodeRight = nodeLeft + (node.width || 150);
        const nodeTop = node.position.y;
        const nodeBottom = nodeTop + (node.height || 40);

        return {
          left: Math.min(acc.left, nodeLeft),
          right: Math.max(acc.right, nodeRight),
          top: Math.min(acc.top, nodeTop),
          bottom: Math.max(acc.bottom, nodeBottom),
        };
      },
      {
        left: Infinity,
        right: -Infinity,
        top: Infinity,
        bottom: -Infinity,
      }
    );

    // Create group node with padding
    const padding = 50;
    const groupId = uuidv4();
    const groupNode = {
      id: groupId,
      type: 'group',
      position: {
        x: bounds.left - padding,
        y: bounds.top - padding,
      },
      style: {
        width: bounds.right - bounds.left + padding * 2,
        height: bounds.bottom - bounds.top + padding * 2,
      },
      data: {
        label: 'Group'
      },
      zIndex: -1 // Ensure group is behind other nodes
    };

    // Create updated nodes array with the new group and updated child nodes
    const updatedNodes = nodes.map(node => {
      if (node.selected) {
        return {
          ...node,
          parentNode: groupId,
          extent: 'parent',
          position: {
            x: node.position.x - bounds.left + padding,
            y: node.position.y - bounds.top + padding,
          },
          selected: false,
          zIndex: 1 // Ensure child nodes are above the group
        };
      }
      return node;
    });

    // Add the group node first, then the other nodes
    dispatch(setNodes({
      nodes: [groupNode, ...updatedNodes]
    }));

  }, [nodes, dispatch]);

  return { onGroup };
};