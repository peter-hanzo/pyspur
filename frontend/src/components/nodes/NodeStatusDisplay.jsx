import React from 'react';

const NodeStatusDisplay = (props) => {
    const { node } = props;
    const nodeID = node?.id;
    const output = node?.data?.run?.data;
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