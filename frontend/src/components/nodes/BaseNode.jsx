import React from 'react';
import { Handle } from 'reactflow';

// Add NextUI imports
import { Card, CardHeader, CardBody, CardFooter, Divider, Link, Image } from "@nextui-org/react";

const BaseNode = ({ data, children, style }) => {
  return (
    // Replace <div> with <Card>
    <Card className="base-node" style={{ ...style }}>
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
      {data.showTargetHandle && (
        <Handle type="target" position="left" style={{ background: '#555' }} />
      )}
      {data.showSourceHandle && (
        <Handle type="source" position="right" style={{ background: '#555' }} />
      )}
    </Card>
  );
};

export default BaseNode;