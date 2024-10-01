import React from 'react';
import { useDispatch } from 'react-redux';
import { Card, CardHeader, CardBody, CardFooter, Divider, Link, Image } from "@nextui-org/react";
import { NodeTargetHandle, NodeSourceHandle } from './NodeHandles';

// Define action types (ensure these match the ones in your flowStore.js)
const SET_HOVERED_NODE = 'SET_HOVERED_NODE';

const BaseNode = ({ id, data = {}, children, style }) => {
  const dispatch = useDispatch();

  const handleMouseEnter = () => {
    dispatch({
      type: SET_HOVERED_NODE,
      payload: { id },
    });
  };

  const handleMouseLeave = () => {
    dispatch({
      type: SET_HOVERED_NODE,
      payload: { id: null },
    });
  };

  return (
    <Card
      className="base-node"
      style={{ ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Optionally include CardHeader */}
      {data && data.title && (
        <CardHeader>
          <p className="text-md">{data.title}</p>
        </CardHeader>
      )}

      {/* Optionally include Divider */}
      {/* <Divider /> */}

      <CardBody>
        {children}
      </CardBody>

      {/* Optionally include Divider */}
      {/* <Divider /> */}

      {/* Optionally include CardFooter */}
      {data.footer && (
        <CardFooter>
          <Link href={data.footerLink}>{data.footer}</Link>
        </CardFooter>
      )}

      {/* Replace Handle components with NodeTargetHandle and NodeSourceHandle */}
      {data.showTargetHandle && (
        <NodeTargetHandle
          id={id}
          data={data}
          handleId="target-handle"
          handleClassName="your-handle-class" // Customize your class names
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