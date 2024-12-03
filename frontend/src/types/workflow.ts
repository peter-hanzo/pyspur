export interface Workflow {
  id: string;
  key?: string;
  name: string;
  description: string;
  definition?: any; // You might want to type this more specifically based on your workflow structure
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