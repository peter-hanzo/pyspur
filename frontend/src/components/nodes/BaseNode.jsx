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
import usePartialRun from '../../hooks/usePartialRun';

const BaseNode = ({ isCollapsed, setIsCollapsed, id, data = {}, children, style = {}, isInputNode = false }) => {
  const [showControls, setShowControls] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  const {
    isHovered,
    isSelected,
    setHovered,
    setSelected,
    deleteNode,
  } = useNode(id);

  const { executePartialRun, loading, error, result } = usePartialRun();

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

  const handlePartialRun = () => {
    const initialInputs = {
      "input_node": { "user_message": "Give me geographical conditions of London" }
    };
    const partialOutputs = {
      "input_node": { "user_message": "Hi There!" },
      "node_1731411247373": { "response": "Hello, How are ya?" }
    };
    const rerunPredecessors = true;

    const workflowId = window.location.pathname.split('/').pop();

    executePartialRun(workflowId, id, initialInputs, partialOutputs, rerunPredecessors);
  };

  const status = data?.run ? 'completed' : (data?.status || 'default').toLowerCase();

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
          <CardHeader
            style={{
              position: 'relative',
              paddingTop: '8px',
              paddingBottom: isCollapsed ? '0px' : '16px',
            }}
          >
            <h3
              className="text-lg font-semibold text-center"
              style={{ marginBottom: isCollapsed ? '4px' : '8px' }}
            >
              {data?.userconfig?.title || data?.title || 'Untitled'}
            </h3>

            {/* Container for the collapse button and acronym tag */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Collapse Button */}
              <Button
                size="sm"
                variant="flat"
                style={{
                  minWidth: 'auto',
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '0.8rem',
                  marginRight: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? '▼' : '▲'}
              </Button>

              {/* Acronym Tag */}
              <div style={{ ...tagStyle }} className="node-acronym-tag">
                {acronym}
              </div>
            </div>
          </CardHeader>
        )}
        {!isCollapsed && <Divider />}

        <CardBody className="px-1">
          {children}
        </CardBody>
      </Card>

      {(showControls || isSelected) && (
        <Card
          onMouseEnter={() => {
            console.log('Mouse enter tooltip');
            setShowControls(true);
            setIsTooltipHovered(true);
          }}
          onMouseLeave={() => {
            console.log('Mouse leave tooltip');
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
              onPress={handlePartialRun}
              disabled={loading}
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
