import React from 'react';
import Markdown from 'react-markdown';

interface NodeData {
  run?: Record<string, string>;
}

interface Node {
  id: string;
  data?: NodeData;
}

interface NodeOutputDisplayProps {
  node: any;
}

const NodeOutputDisplay: React.FC<NodeOutputDisplayProps> = ({ node }) => {
  const nodeID = node?.id;
  const output: Record<string, any> = node?.data?.run;

  return (
    <>
      {output && (
        <div 
          className='p-5'
          style={{ maxHeight: '400px', overflowY: 'auto' }}
          onWheel={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <div>
            {Object.entries(output).map(([key, value]) => (
              <div key={key} className="my-2 flex flex-col items-start">
                <label className="text-sm font-semibold mb-1 block">{key}:</label>
                <div className="ml-2 mt-auto">
                  <Markdown children={value} />
                </div>
              </div>
            ))}
          </div>
        </div>)
      }
    </>
  );
};

export default NodeOutputDisplay;
