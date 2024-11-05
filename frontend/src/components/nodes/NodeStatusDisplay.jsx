import React from 'react';
import { useSelector } from 'react-redux';
import { selectNodeById } from '../../store/flowSlice';

const NodeStatusDisplay = ({ nodeID }) => {
    const node = useSelector((state) => selectNodeById(state, nodeID));
    const status = node?.data?.status || 'loading';
    const output = node?.data?.runoutput;

    return (
        <div>
            <div>Status: {status}</div>
            {output && <div>Output: {output}</div>}
        </div>
    );
};

export default NodeStatusDisplay;