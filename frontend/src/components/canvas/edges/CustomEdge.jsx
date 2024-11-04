import React from 'react';
import { useReactFlow, getBezierPath } from 'reactflow';
import { Button } from '@nextui-org/react';
import { Icon } from "@iconify/react";
import { useDispatch } from 'react-redux';
import { deleteEdge } from '../../../store/flowSlice';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  source,
  target,
}) => {
  const { onPopoverOpen, showPlusButton } = data;
  const reactFlowInstance = useReactFlow();
  const dispatch = useDispatch();
  const sourceNode = reactFlowInstance.getNode(source);
  const targetNode = reactFlowInstance.getNode(target);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDeleteEdge = (event) => {
    event.stopPropagation();
    dispatch(deleteEdge({ edgeId: id }));
  };

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
      />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        style={{ pointerEvents: 'stroke' }}
        className="react-flow__edge-hover"
      />
      {showPlusButton && (
        <foreignObject
          width={65}
          height={30}
          x={labelX - 32}
          y={labelY - 15}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              pointerEvents: 'all',
              display: 'flex',
              gap: '5px',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <Button
              isIconOnly
              auto
              onClick={() => {
                onPopoverOpen({ sourceNode, targetNode, edgeId: id });
              }}
            >
              <Icon icon="solar:add-circle-bold" width={20} className="text-default-500" />
            </Button>
            <Button
              isIconOnly
              auto
              onClick={handleDeleteEdge}
            >
              <Icon icon="solar:trash-bin-trash-bold" width={20} />
            </Button>
          </div>
        </foreignObject>
      )}
    </>
  );
};

export default CustomEdge;