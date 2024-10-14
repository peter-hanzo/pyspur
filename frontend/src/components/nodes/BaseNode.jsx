import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setHoveredNode } from '../../store/flowSlice';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Link,
} from "@nextui-org/react";
import { NodeTargetHandle, NodeSourceHandle } from './NodeHandles';

const BaseNode = ({ id, data = {}, children, style = {} }) => {
  const dispatch = useDispatch();

  const hoveredNodeId = useSelector((state) => state.flow.hoveredNode);

  const handleMouseEnter = () => {
    dispatch(setHoveredNode({ nodeId: id }));
  };

  const handleMouseLeave = () => {
    dispatch(setHoveredNode({ nodeId: null }));
  };

  // Determine if this node is currently hovered
  const isHovered = String(id) === String(hoveredNodeId);
  console.log('Node ID:', id, 'Hovered Node ID:', hoveredNodeId, 'isHovered:', isHovered);

  const cardStyle = {
    ...style,
    borderColor: isHovered ? '#4CAF50' : style.borderColor || '#ccc',
    borderWidth: isHovered ? '2px' : style.borderWidth || '1px',
    borderStyle: 'solid',
    transition: 'border-color 0.2s, border-width 0.2s',
  };

  return (
    <Card
      className="base-node"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {data && data.title && (
        <CardHeader>
          <p className="text-md">{data.title}</p>
        </CardHeader>
      )}

      <CardBody>{children}</CardBody>

      {data.footer && (
        <CardFooter>
          <Link href={data.footerLink}>{data.footer}</Link>
        </CardFooter>
      )}

      {data.showTargetHandle && (
        <NodeTargetHandle
          id={id}
          data={data}
          handleId="target-handle"
          handleClassName="your-handle-class"
          nodeSelectorClassName="your-selector-class"
        />
      )}
      {data.showSourceHandle && (
        <NodeSourceHandle
          id={id}
          data={data}
          handleId="source-handle"
          handleClassName="your-handle-class"
          nodeSelectorClassName="your-selector-class"
        />
      )}
    </Card>
  );
};

export default BaseNode;