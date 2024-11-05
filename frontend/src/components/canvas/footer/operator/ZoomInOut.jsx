import React from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { Card, Button } from '@nextui-org/react';
import { Icon } from "@iconify/react";

const ZoomInOut = () => {
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className="zoom-controls flex items-center gap-2">
        <Button isIconOnly variant="light" onClick={zoomOut}>
          <Icon icon="solar:minimize-square-linear" width={16} className="text-default-500" />
        </Button>
        <span className="text-sm text-default-500">{(zoom * 100).toFixed(0)}%</span>
        <Button isIconOnly variant="light" onClick={zoomIn}>
          <Icon icon="solar:maximize-square-linear" width={16} className="text-default-500" />
        </Button>
      </div>
    </Card>
  );
};

export default ZoomInOut;