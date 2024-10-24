import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useReactFlow } from 'reactflow';
import { addNode } from '../store/flowSlice';

export const useNodeSelector = () => {
  const reactFlowInstance = useReactFlow();
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();

  const handleSelectNode = (nodeType, sourceNode = null, targetNode = null) => {
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

    // If sourceNode and targetNode are provided, update the edges
    if (sourceNode && targetNode) {
      const newEdge1 = {
        id: `e${sourceNode.id}-${newNode.id}`,
        source: sourceNode.id,
        target: newNode.id,
        type: 'custom',
      };

      const newEdge2 = {
        id: `e${newNode.id}-${targetNode.id}`,
        source: newNode.id,
        target: targetNode.id,
        type: 'custom',
      };

      // Remove the original edge between sourceNode and targetNode
      reactFlowInstance.setEdges((eds) =>
        eds.filter((edge) => !(edge.source === sourceNode.id && edge.target === targetNode.id))
      );

      // Add the new edges
      reactFlowInstance.addEdges([newEdge1, newEdge2]);
    }

    setVisible(false);
  };

  return {
    visible,
    setVisible,
    handleSelectNode,
  };
};
