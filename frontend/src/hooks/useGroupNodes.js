import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { nodesChange } from '../store/flowSlice';
import { v4 as uuidv4 } from 'uuid';

export const useGroupNodes = () => {
  const dispatch = useDispatch();
  const nodes = useSelector(state => state.flow.nodes);

  const onGroup = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected && !node.parentId);
    if (selectedNodes.length <= 1) return;

    // Calculate bounds of selected nodes
    const bounds = selectedNodes.reduce((acc, node) => ({
      minX: Math.min(acc.minX, node.position.x),
      minY: Math.min(acc.minY, node.position.y),
      maxX: Math.max(acc.maxX, node.position.x + (node.width || 0)),
      maxY: Math.max(acc.maxY, node.position.y + (node.height || 0))
    }), {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    });

    const padding = 50;
    const groupId = uuidv4();

    // Create group node
    const groupNode = {
      id: groupId,
      type: 'group',
      position: {
        x: bounds.minX - padding,
        y: bounds.minY - padding
      },
      style: {
        width: bounds.maxX - bounds.minX + padding * 2,
        height: bounds.maxY - bounds.minY + padding * 2,
        zIndex: -1
      },
      data: {
        label: `Group ${nodes.filter(n => n.type === 'group').length + 1}`
      },
      draggable: true,
      selectable: true
    };

    // Update selected nodes to be children of the group
    const updatedNodes = nodes.map(node => {
      if (node.selected && !node.parentId) {
        return {
          ...node,
          selected: false, // Deselect nodes when grouping
          position: {
            x: node.position.x - bounds.minX + padding,
            y: node.position.y - bounds.minY + padding
          },
          parentId: groupId,
          extent: 'parent',
          draggable: true,
          zIndex: 1
        };
      }
      return node;
    });

    dispatch(nodesChange({
      changes: [
        { item: groupNode, type: 'add' },
        ...updatedNodes.map(node => ({ item: node, type: 'reset' }))
      ]
    }));
  }, [nodes, dispatch]);

  return { onGroup };
};