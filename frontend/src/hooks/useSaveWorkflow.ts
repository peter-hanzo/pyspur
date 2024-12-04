import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { updateWorkflow } from '../utils/api';
import { RootState } from '../store/store';

interface Position {
  x: number;
  y: number;
}

interface NodeData {
  config: {
    data?: {
      input_schema?: Record<string, string>;
      output_schema?: Record<string, string>;
    };
    input_schema?: Record<string, string>;
  };
  title?: string;
}

interface Node {
  id: string;
  type: string;
  position: Position;
  data: NodeData;
  config?: any;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

interface UpdatedWorkflow {
  name: string;
  definition: {
    nodes: {
      id: string;
      node_type: string;
      config: any;
      coordinates: Position;
    }[];
    links: {
      source_id: string;
      source_output_key: string;
      source_output_type: string;
      target_id: string;
      target_input_key: string;
      target_input_type: string;
    }[];
    test_inputs: Record<string, any>;
  };
}

export const useSaveWorkflow = (trigger: unknown, delay: number = 2000) => {
  const nodes = useSelector((state: RootState) => state.flow.nodes);
  const edges = useSelector((state: RootState) => state.flow.edges);
  const workflowID = useSelector((state: RootState) => state.flow.workflowID);
  const workflowInputVariables = useSelector((state: RootState) => state.flow.workflowInputVariables);
  const workflowName = useSelector((state: RootState) => state.flow.projectName);
  const testInputs = useSelector((state: RootState) => state.flow.testInputs);

  const saveWorkflow = useCallback(async () => {
    try {
      const updatedNodes = nodes
        .filter((node: Node | null | undefined): node is Node => node !== null && node !== undefined)
        .map((node: Node) => {
          if (node.type === 'InputNode') {
            return {
              ...node,
              config: {
                ...node.data.config,
                input_schema: Object.fromEntries(
                  Object.keys(workflowInputVariables).map(key => [key, "str"])
                )
              }
            };
          } else {
            return {
              ...node,
              config: node.data?.config,
              title: node.data?.title
            };
          }
        });

      const updatedWorkflow: UpdatedWorkflow = {
        name: workflowName,
        definition: {
          nodes: updatedNodes.map(node => ({
            id: node.id,
            node_type: node.type,
            config: node.config,
            coordinates: node.position,
          })),
          links: edges.map((edge: Edge) => {
            const sourceNode = nodes.find(node => node?.id === edge.source);
            const targetNode = nodes.find(node => node?.id === edge.target);

            return {
              source_id: edge.source,
              source_output_key: edge.sourceHandle,
              source_output_type: sourceNode?.data?.config?.data?.output_schema?.[edge.sourceHandle] || 'str',
              target_id: edge.target,
              target_input_key: edge.targetHandle,
              target_input_type: targetNode?.data?.config?.data?.input_schema?.[edge.targetHandle] || 'str',
            };
          }),
          test_inputs: testInputs,
        }
      };

      console.log('send to b/e workflow:', updatedWorkflow);
      await updateWorkflow(workflowID, updatedWorkflow);
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  }, [workflowID, nodes, edges, workflowInputVariables, workflowName, testInputs]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        saveWorkflow();
      }
    }, delay);

    return () => clearTimeout(handle);
  }, [nodes, edges, saveWorkflow, trigger, delay]);

  return saveWorkflow;
};