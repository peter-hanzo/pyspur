import React, { memo } from 'react';
import { NodeResizer, NodeToolbar } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteNode, detachNodes } from '../../store/flowSlice';

const GroupNode = ({ id, selected, data }) => {
  const dispatch = useDispatch();
  const nodes = useSelector(state => state.flow.nodes);

  // Get child nodes (nodes that have this group as their parent)
  const childNodes = nodes.filter(n => n.parentId === id);
  const hasChildNodes = childNodes.length > 0;

  const onDelete = () => {
    dispatch(deleteNode({ nodeId: id }));
  };

  const onDetach = () => {
    const childNodeIds = childNodes.map(n => n.id);
    dispatch(detachNodes({ nodeIds: childNodeIds, groupId: id }));
  };

  return (
    <div
      className="group-node"
      style={{
        background: 'rgba(240, 240, 240, 0.8)',
        border: selected ? '2px solid #FF9800' : '1px solid #ccc',
        borderRadius: '8px',
        padding: '20px',
        position: 'relative',
        minWidth: '200px',
        minHeight: '200px',
        transition: 'border-color 0.1s, border-width 0.02s',
      }}
    >
      <div
        className="group-header"
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          right: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          zIndex: 1
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#666' }}>
          {data?.label || 'Group'}
        </span>

        <div className="group-actions">
          <button
            onClick={onDetach}
            style={{
              marginRight: '4px',
              padding: '2px 8px',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: hasChildNodes ? 'pointer' : 'not-allowed',
              opacity: hasChildNodes ? 1 : 0.5
            }}
            disabled={!hasChildNodes}
          >
            Ungroup
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '2px 8px',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <NodeResizer
        minWidth={200}
        minHeight={200}
        isVisible={selected}
        lineStyle={{
          borderWidth: 1,
          borderColor: selected ? '#FF9800' : '#ccc'
        }}
      />

      {/* This div ensures child nodes are rendered properly */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        zIndex: 0
      }}>
        {childNodes.map(node => (
          <div key={node.id} style={{ position: 'absolute' }}>
            {node.data}
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(GroupNode);