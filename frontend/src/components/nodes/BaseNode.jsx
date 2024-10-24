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

const BaseNode = ({ id, data = {}, children, style = {} }) => {
  const dispatch = useDispatch();

  const hoveredNodeId = useSelector((state) => state.flow.hoveredNode);

  const handleMouseEnter = () => {
    dispatch(setHoveredNode({ nodeId: id }));
  };

  const handleMouseLeave = () => {
    dispatch(setHoveredNode({ nodeId: null }));
  };

  const isHovered = String(id) === String(hoveredNodeId);

  const cardStyle = {
    ...style,
    borderColor: isHovered ? '#4CAF50' : style.borderColor || '#ccc',
    borderWidth: isHovered ? '2px' : style.borderWidth || '1px',
    borderStyle: 'solid',
    transition: 'border-color 0.1s, border-width 0.02s',
    position: 'relative', // Add this to ensure proper positioning of handles
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
    </Card>
  );
};

export default BaseNode;
