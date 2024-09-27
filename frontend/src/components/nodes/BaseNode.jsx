import React from 'react';
import useFlowStore from '../../store/flowStore';

// Add NextUI imports
import { Card, CardHeader, CardBody, CardFooter, Divider, Link, Image } from "@nextui-org/react";

// Import NodeTargetHandle and NodeSourceHandle components
import { NodeTargetHandle, NodeSourceHandle } from './NodeHandles';

const BaseNode = ({ id, data, children, style }) => {
  // Get setHoveredNode from useFlowStore
  const setHoveredNode = useFlowStore((state) => state.setHoveredNode);

  return (
    // Replace <div> with <Card>
    <Card
      className="base-node"
      style={{ ...style }}
      onMouseEnter={() => setHoveredNode(id)}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {/* Optionally include CardHeader */}
      {data.title && (
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
          id={data.id}
          data={data}
          handleId="target-handle"
          handleClassName="your-handle-class" // Customize your class names
          nodeSelectorClassName="your-selector-class"
        />
      )}
      {data.showSourceHandle && (
        <NodeSourceHandle
          id={data.id}
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