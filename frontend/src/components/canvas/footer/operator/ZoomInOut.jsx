import React from 'react';
import { RiZoomInLine, RiZoomOutLine } from '@remixicon/react';
import { useReactFlow, useViewport } from 'reactflow';
import { Card } from '@nextui-org/react'; // Add this import

const ZoomInOut = () => {
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <Card className='h-12 flex items-center justify-center'>  {/* Added flex properties */}
      <div className="zoom-controls">
        <button onClick={zoomOut}>
          <RiZoomOutLine />
        </button>
        <span>{(zoom * 100).toFixed(0)}%</span>
        <button onClick={zoomIn}>
          <RiZoomInLine />
        </button>
      </div>
    </Card>
  );
};

export default ZoomInOut;