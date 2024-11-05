import React, { memo } from 'react';
import { NodeResizer } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteNode, detachNodes } from '../../store/flowSlice';
import { Button } from '@nextui-org/react';
import DynamicNode from './DynamicNode';

const GroupNode = ({ id, selected }) => {
  const dispatch = useDispatch();
  const nodes = useSelector(state => state.flow.nodes);
  const childNodes = nodes.filter(n => n.parentNode === id);

  const onDelete = () => {
    dispatch(deleteNode({ nodeId: id }));
  };

  const onUngroup = () => {
    const childNodeIds = childNodes.map(n => n.id);
    dispatch(detachNodes({ nodeIds: childNodeIds, groupId: id }));
  };

  return (
    <>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(240, 240, 240, 0.2)',
          borderRadius: '8px',
          border: selected ? '2px solid #0072F5' : '1px solid #ccc',
          position: 'relative',
          padding: '4px',
          zIndex: 0
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            borderBottom: '1px solid #eee',
            zIndex: 1
          }}
        >
          <span style={{ fontWeight: 500, color: '#666' }}>Group</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button
              size="sm"
              variant="flat"
              color="default"
              onClick={onUngroup}
            >
              Ungroup
            </Button>
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onClick={onDelete}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Container for child nodes */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          paddingTop: '40px', // Space for the header
          zIndex: 0
        }}>
          {childNodes.map(node => (
            <DynamicNode
              key={node.id}
              id={node.id}
              type={node.type}
              xPos={node.position.x}
              yPos={node.position.y}
              selected={node.selected}
              parentNode={id}
            />
          ))}
        </div>
      </div>
      <NodeResizer
        minWidth={100}
        minHeight={100}
        isVisible={selected}
        lineStyle={{ borderWidth: 1 }}
      />
    </>
  );
};

export default memo(GroupNode);