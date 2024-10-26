import React, { useEffect } from 'react';
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
  const selectedNodeId = useSelector((state) => state.flow.selectedNode); // Get selectedNodeID from Redux

  const handleMouseEnter = () => {
    dispatch(setHoveredNode({ nodeId: id }));
  };

  const handleMouseLeave = () => {
    dispatch(setHoveredNode({ nodeId: null }));
  };

  const isHovered = String(id) === String(hoveredNodeId);
  const isSelected = String(id) === String(selectedNodeId); // Check if the node is selected

  const cardStyle = {
    ...style,
    borderColor: isSelected ? '#FF9800' : isHovered ? '#4CAF50' : style.borderColor || '#ccc', // Highlight selected node with orange
    borderWidth: isSelected ? '3px' : isHovered ? '2px' : style.borderWidth || '1px', // Thicker border for selected node
    borderStyle: 'solid',
    transition: 'border-color 0.1s, border-width 0.02s',
    position: 'relative', // Ensure proper positioning of handles
  };

  useEffect(() => {
    console.log("data.title has changed:", data.title);
  }, [data.title]); // Log whenever data.title changes

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
