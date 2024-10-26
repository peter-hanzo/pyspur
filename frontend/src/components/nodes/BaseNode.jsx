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

  // Extract acronym and color from data
  const acronym = data.acronym || 'N/A'; // Default to 'N/A' if acronym is not provided
  const color = data.color || '#ccc'; // Default to grey if color is not provided

  const tagStyle = {
    backgroundColor: color,
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    display: 'inline-block',
    marginBottom: '8px',
  };

  return (
    <Card
      className="base-node"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      isHoverable
    >
      {data && data.title && (
        <CardHeader style={{ position: 'relative' }}>
          <h3 className="text-lg font-semibold text-center">{data.title}</h3>
          {/* Display the acronym tag in the top-right corner */}
          <div style={{ ...tagStyle, position: 'absolute', top: '8px', right: '8px' }} className="node-acronym-tag">
            {acronym}
          </div>
        </CardHeader>
      )}

      {/* <CardBody>{children}</CardBody> */}


    </Card>
  );
};

export default BaseNode;
