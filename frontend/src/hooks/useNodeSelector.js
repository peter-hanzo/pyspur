import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useReactFlow } from 'reactflow';
import { addNode } from '../store/flowSlice';

export const useNodeSelector = () => {
  const reactFlowInstance = useReactFlow();
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();

  const handleSelectNode = (nodeType) => {
    const id = `${reactFlowInstance.getNodes().length + 1}`;

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
    const initialData = { label: `Node ${id}`, nodeType: nodeType };

    const newNode = {
      id,
      type: mappedType,
      position: reactFlowInstance.project({ x: 250, y: 5 }),
      data: initialData,
    };

    dispatch(addNode({ node: newNode }));
    reactFlowInstance.addNodes(newNode);
    setVisible(false);
  };

  return {
    visible,
    setVisible,
    handleSelectNode,
  };
};
