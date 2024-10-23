import React, { useState } from 'react';
import { RiAddCircleFill } from '@remixicon/react';
import { useReactFlow } from 'reactflow';
import { Card, Popover, PopoverTrigger, PopoverContent, Button } from '@nextui-org/react';
import { useSelector, useDispatch } from 'react-redux';
import { addNode } from '../../../../store/flowSlice';

const Control = () => {
  const reactFlowInstance = useReactFlow();
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();
  const hoveredNode = useSelector((state) => state.hoveredNode);

  const handleSelectNode = (nodeType) => {
    const id = `${reactFlowInstance.getNodes().length + 1}`;

    // Updated nodeTypeMapping to include new node types
    const nodeTypeMapping = {
      'BasicLLMNode': 'BasicLLMNode',
      'StructuredOutputLLMNode': 'StructuredOutputLLMNode',
      'PythonFuncNode': 'PythonFuncNode',
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
    };

    const mappedType = nodeTypeMapping[nodeType] || nodeType;
    let initialData = { label: `Node ${id}`, nodeType: nodeType };

    // You might want to add specific initialData for new node types if needed
    // if (mappedType === 'BasicLLMNode' || mappedType === 'StructuredOutputLLMNode') {
    //   initialData = { ...initialData, config: {} };
    // } else if (mappedType === 'PythonFuncNode') {
    //   initialData = { ...initialData, config: { code: '', input_schema: {}, output_schema: {} } };
    // }

    const newNode = {
      id,
      type: mappedType,
      position: reactFlowInstance.project({ x: 250, y: 5 }),
      data: initialData,
    };

    dispatch(addNode({ node: newNode }));
    // reactFlowInstance.addNodes(newNode);
    setVisible(false);
  };

  const setHoveredNode = (id) => {
    dispatch({ type: 'SET_HOVERED_NODE', payload: { id } });
  };

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className='flex items-center text-gray-500'>
        <Popover placement="bottom" showArrow={true} isOpen={visible} onOpenChange={setVisible}>
          <PopoverTrigger>
            <Button auto light>
              <RiAddCircleFill />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className='p-4 flex flex-col space-y-2'>
              <div className='flex flex-col space-y-2'>
                <h3 className='text-sm font-semibold'>Blocks</h3>
                <Button auto light onClick={() => handleSelectNode('BasicLLMNode')}>Basic LLM Node</Button>
                <Button auto light onClick={() => handleSelectNode('StructuredOutputLLMNode')}>Structured Output LLM Node</Button>
                <Button auto light onClick={() => handleSelectNode('PythonFuncNode')}>Python Function Node</Button>
                <Button auto light onClick={() => handleSelectNode('LLM')}>LLM</Button>
                <Button auto light onClick={() => handleSelectNode('Knowledge Retrieval')}>Knowledge Retrieval</Button>
                <Button auto light onClick={() => handleSelectNode('End')}>End</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
};

export default Control;
