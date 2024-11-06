import React from 'react';
import { useSelector } from 'react-redux';
import { selectNodeById } from '../../store/flowSlice';

const NodeStatusDisplay = ({ nodeID }) => {
    const node = useSelector((state) => selectNodeById(state, nodeID));
    const output = node?.data?.run;

    return (
        <div>
            {output && <div>Output: {output}</div>}
        </div>
    );
};

export default NodeStatusDisplay;