import React from 'react';
import { RiZoomInLine, RiZoomOutLine } from '@remixicon/react';
import { useReactFlow, useViewport } from 'reactflow';

const ZoomInOut = () => {
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <div className="zoom-controls">
      <button onClick={zoomOut}>
        <RiZoomOutLine />
      </button>
      <span>{(zoom * 100).toFixed(0)}%</span>
      <button onClick={zoomIn}>
        <RiZoomInLine />
      </button>
    </div>
  );
};

export default ZoomInOut;