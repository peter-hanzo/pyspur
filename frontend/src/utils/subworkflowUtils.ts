import { WorkflowDefinition} from '@/types/api_types/workflowSchemas';
import { TaskResponse } from '@/types/api_types/taskSchemas';

interface RolloutWorkflowParams {
  workflowDefinition: WorkflowDefinition;
  tasks: TaskResponse[];
}

export function rolloutWorkflowDefinition({ 
  workflowDefinition, 
  tasks 
}: RolloutWorkflowParams): WorkflowDefinition {
  // Create a deep copy of the workflow definition to avoid mutations
  const rolledOutDefinition: WorkflowDefinition = JSON.parse(JSON.stringify(workflowDefinition));
  
  // Create maps for quick lookup
  const taskMap = new Map(tasks.map(task => [task.node_id, task]));
  
  // Process each task that has a subworkflow
  tasks.forEach(task => {
    if (!task.subworkflow) return;
    
    const nodeToReplace = rolledOutDefinition.nodes.find(node => node.id === task.node_id);
    if (!nodeToReplace) return;
    
    const subworkflow = task.subworkflow;
    
    // Generate unique IDs for subworkflow nodes to avoid conflicts
    const prefix = `${task.node_id}_`;
    const subworkflowNodes = subworkflow.nodes.map(node => ({
      ...node,
      id: node.id,
      coordinates: {
        x: nodeToReplace.coordinates.x,
        y: nodeToReplace.coordinates.y
      }
    }));
    
    // Find input and output nodes of the subworkflow
    const inputNode = subworkflowNodes.find(node => node.node_type === 'InputNode');
    const outputNode = subworkflowNodes.find(node => node.node_type === 'OutputNode');
    
    if (!inputNode || !outputNode) {
      console.error('Subworkflow missing input or output node');
      return;
    }
    
    // Reroute incoming edges
    rolledOutDefinition.links.forEach(link => {
      if (link.target_id === nodeToReplace.id) {
        link.target_id = inputNode.id;
      }
      if (link.source_id === nodeToReplace.id) {
        link.source_id = outputNode.id;
      }
    });
    
    // Remove the original node
    rolledOutDefinition.nodes = rolledOutDefinition.nodes.filter(
      node => node.id !== nodeToReplace.id
    );
    
    // Add subworkflow nodes and edges
    rolledOutDefinition.nodes.push(...subworkflowNodes);
    rolledOutDefinition.links.push(...subworkflow.links);
  });
  
  return rolledOutDefinition;
} 