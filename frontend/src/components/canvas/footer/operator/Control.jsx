import React, { useState } from 'react';
import { RiAddCircleFill } from '@remixicon/react';
import { useReactFlow } from 'reactflow';
import { Card, Popover, PopoverTrigger, PopoverContent, Button } from '@nextui-org/react'; // Updated imports
import { useSelector, useDispatch } from 'react-redux'; // Added Redux imports
import { addNode } from '../../../../store/flowSlice';
const Control = () => {
  const reactFlowInstance = useReactFlow();
  const [visible, setVisible] = useState(false); // State to control popover visibility
  const dispatch = useDispatch(); // Added Redux dispatch
  const hoveredNode = useSelector((state) => state.hoveredNode); // Added Redux state access

  const handleSelectNode = (nodeType) => {
    const id = `${reactFlowInstance.getNodes().length + 1}`;

    // Map the nodeType to the component type
    const nodeTypeMapping = {
      'LLM': 'LLMNode',
      'Knowledge Retrieval': 'KnowledgeRetrievalNode',
      'End': 'EndNode',
      'Question Classifier': 'QuestionClassifierNode',
      'IF/ELSE': 'IfElseNode',
      'Iteration': 'IterationNode',
      'Code': 'CodeNode',
      'Template': 'TemplateNode',
      'Variable Aggregator': 'VariableAggregatorNode',
      'Variable Assigner': 'VariableAssignerNode',
      'Parameter Extractor': 'ParameterExtractorNode',
      'HTTP Request': 'HttpRequestNode',
      // Add other mappings as needed
    };

    const mappedType = nodeTypeMapping[nodeType] || nodeType;
    // Determine the initial data based on node type
    let initialData = { label: `Node ${id}`, title: nodeType };
    if (mappedType === 'LLMNode') {
      initialData = { ...initialData, prompt: '' }; // Initialize prompt for LLMNode
    }

    const newNode = {
      id,
      type: mappedType, // Use the mapped type
      position: reactFlowInstance.project({ x: 250, y: 5 }), // Updated to use project method
      data: initialData,
    };

    // Dispatch the addNode action to Redux
    dispatch(addNode({ node: newNode }));
    reactFlowInstance.addNodes(newNode);
    setVisible(false); // Close the popover after adding a node
  };

  const setHoveredNode = (id) => {
    dispatch({ type: 'SET_HOVERED_NODE', payload: { id } }); // Added Redux action dispatch
  };

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className='flex items-center text-gray-500'>
        <Popover placement="bottom" showArrow={true} isOpen={visible} onOpenChange={setVisible}>
          <PopoverTrigger>
            <Button auto light>  {/* Removed onClick */}
              <RiAddCircleFill />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            {/* List of blocks and tools */}
            <div className='p-4 flex flex-col space-y-2'>
              <div className='flex flex-col space-y-2'>
                <h3 className='text-sm font-semibold'>Blocks</h3>
                <Button auto light onClick={() => handleSelectNode('LLM')}>LLM</Button>
                <Button auto light onClick={() => handleSelectNode('Knowledge Retrieval')}>Knowledge Retrieval</Button>
                <Button auto light onClick={() => handleSelectNode('End')}>End</Button>
              </div>
              <div className='flex flex-col space-y-2'>
                <h3 className='text-sm font-semibold'>Question Understand</h3>
                <Button auto light onClick={() => handleSelectNode('Question Classifier')}>Question Classifier</Button>
              </div>
              <div className='flex flex-col space-y-2'>
                <h3 className='text-sm font-semibold'>Logic</h3>
                <Button auto light onClick={() => handleSelectNode('IF/ELSE')}>IF/ELSE</Button>
                <Button auto light onClick={() => handleSelectNode('Iteration')}>Iteration</Button>
              </div>
              <div className='flex flex-col space-y-2'>
                <h3 className='text-sm font-semibold'>Transform</h3>
                <Button auto light onClick={() => handleSelectNode('Code')}>Code</Button>
                <Button auto light onClick={() => handleSelectNode('Template')}>Template</Button>
                <Button auto light onClick={() => handleSelectNode('Variable Aggregator')}>Variable Aggregator</Button>
                <Button auto light onClick={() => handleSelectNode('Variable Assigner')}>Variable Assigner</Button>
                <Button auto light onClick={() => handleSelectNode('Parameter Extractor')}>Parameter Extractor</Button>
              </div>
              <div className='flex flex-col space-y-2'>
                <h3 className='text-sm font-semibold'>Utilities</h3>
                <Button auto light onClick={() => handleSelectNode('HTTP Request')}>HTTP Request</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
};

export default Control;