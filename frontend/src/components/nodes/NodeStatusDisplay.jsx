import React from 'react';
import { useSelector } from 'react-redux';
import { selectNodeById } from '../../store/flowSlice';

const NodeStatusDisplay = ({ nodeID }) => {
    const node = useSelector((state) => selectNodeById(state, nodeID));
    const output = node?.data?.run;
    console.log('NodeStatusDisplay:', nodeID, output);

    return (
        <div>
            {output ? (
                <div>
                    {Object.entries(output).map(([key, value]) => (
                        <div key={key} className="my-2 flex items-center">
                            <label className="text-sm font-semibold mb-1 block">{key}:</label>
                            <div className="ml-2">{value}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div>No output available</div>
            )}
        </div>
    );
};

export default NodeStatusDisplay;