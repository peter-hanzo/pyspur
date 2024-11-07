import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setHoveredNode } from '../../store/flowSlice';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Button,
  Tooltip,
} from "@nextui-org/react";
import { Icon } from "@iconify/react";

const BaseNode = ({ id, data = {}, children, style = {} }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const dispatch = useDispatch();

  const hoveredNodeId = useSelector((state) => state.flow.hoveredNode);
  const selectedNodeId = useSelector((state) => state.flow.selectedNode); // Get selectedNodeID from Redux

  const handleMouseEnter = () => {
    dispatch(setHoveredNode({ nodeId: id }));
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    dispatch(setHoveredNode({ nodeId: null }));
    // Only start the hide timer if tooltip isn't being hovered
    if (!isTooltipHovered) {
      setTimeout(() => {
        setShowControls(false);
      }, 200);
    }
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

  const collapseButtonStyle = {
    position: 'absolute',
    right: '8px',
    bottom: '4px',
    minWidth: 'auto',
    height: '20px',
    padding: '0 8px',
    fontSize: '0.7rem',
  };

  return (
    <div style={{ position: 'relative' }}> {/* Wrap the node in a div with relative positioning */}
      <Card
        className="base-node"
        style={cardStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        isHoverable
      >
        {data && data.title && (
          <CardHeader style={{ position: 'relative', paddingBottom: '28px' }}>
            <h3 className="text-lg font-semibold text-center">{data.userconfig.title || data.title}</h3>
            {/* Acronym tag */}
            <div style={{ ...tagStyle, position: 'absolute', top: '8px', right: '8px' }} className="node-acronym-tag">
              {acronym}
            </div>
            {/* Collapse button */}
            <Button
              size="sm"
              variant="flat"
              style={collapseButtonStyle}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? '▼' : '▲'}
            </Button>
          </CardHeader>
        )}
        <Divider />

        {!isCollapsed && <CardBody>{children}</CardBody>}
      </Card>

      {(showControls || isSelected) && (
        <Tooltip
          placement="top-end"
          content="Run From Here"
          color="secondary"
        >
          <Card
            onMouseEnter={() => {
              setShowControls(true);
              setIsTooltipHovered(true);
            }}
            onMouseLeave={() => {
              setIsTooltipHovered(false);
              setTimeout(() => {
                if (!isHovered) {
                  setShowControls(false);
                }
              }, 300);
            }}
            style={{
              position: 'absolute',
              top: '-50px',
              right: '0px',
              padding: '4px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Button
              isIconOnly
              radius="full"
              variant="light"
            >
              <Icon className="text-default-500" icon="solar:play-linear" width={22} />
            </Button>
          </Card>
        </Tooltip>
      )}
    </div>
  );
};

export default BaseNode;
