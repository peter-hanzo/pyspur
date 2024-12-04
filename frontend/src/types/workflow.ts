export interface WorkflowNodeCoordinates {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  title?: string;
  node_type: string;
  config: Record<string, any>;
  coordinates?: WorkflowNodeCoordinates;
}

export interface WorkflowLink {
  source_id: string;
  source_output_key: string;
  target_id: string;
  target_input_key: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  links: WorkflowLink[];
  test_inputs: Record<string, any>[];
}

export interface Workflow {
  id: string;
  key?: string;
  name: string;
  description: string;
  definition: WorkflowDefinition;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

export interface Template {
  file_name: string;
  name: string;
  description: string;
  features: string[];
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
}