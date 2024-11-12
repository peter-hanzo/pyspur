import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Button,
} from "@nextui-org/react";
import { Icon } from "@iconify/react";
import useNode from '../../hooks/useNode';

const BaseNode = ({ id, data = {}, children, style = {}, isInputNode = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  const {
    isHovered,
    isSelected,
    setHovered,
    setSelected,
    deleteNode,
  } = useNode(id);

  const handleMouseEnter = () => {
    setHovered(true);
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (!isTooltipHovered) {
      setTimeout(() => {
        setShowControls(false);
      }, 200);
    }
  };

  const handleDelete = () => {
    deleteNode();
    if (isSelected) {
      setSelected(false);
    }
  };

  const status = data.run && data.run.data ? 'completed' : (data.status || 'default').toLowerCase();

  const borderColor = status === 'completed' ? '#4CAF50' :
    status === 'failed' ? 'red' :
      status === 'default' ? 'black' :
        style.borderColor || '#ccc';

  const cardStyle = {
    ...style,
    borderColor: borderColor,
    borderWidth: isSelected ? '3px' : isHovered ? '3px' : style.borderWidth || '1px',
    borderStyle: 'solid',
    transition: 'border-color 0.1s, border-width 0.02s',
    position: 'relative',
  };

  const acronym = data.acronym || 'N/A';
  const color = data.color || '#ccc';

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
    <div style={{ position: 'relative' }}>
      <Card
        className="base-node"
        style={cardStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        isHoverable
      >
        {data && data.title && (
          <CardHeader style={{ position: 'relative', paddingBottom: '28px' }}>
            <h3 className="text-lg font-semibold text-center">{data?.userconfig?.title || data?.title || 'Untitled'}</h3>
            <div style={{ ...tagStyle, position: 'absolute', top: '8px', right: '8px' }} className="node-acronym-tag">
              {acronym}
            </div>
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

        {!isCollapsed && 
          <CardBody
            className="px-1"
          >
            {children}
          </CardBody>}
      </Card>

      {(showControls || isSelected) && (
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
          <div className="flex flex-row gap-1">
            <Button
              isIconOnly
              radius="full"
              variant="light"
            >
              <Icon className="text-default-500" icon="solar:play-linear" width={22} />
            </Button>
            {!isInputNode && (
              <Button
                isIconOnly
                radius="full"
                variant="light"
                onPress={handleDelete}
              >
                <Icon className="text-default-500" icon="solar:trash-bin-trash-linear" width={22} />
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BaseNode;