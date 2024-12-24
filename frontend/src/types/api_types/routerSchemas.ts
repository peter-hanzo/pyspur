// routerSchemas.ts
export type LogicalOperator = 'AND' | 'OR';
export type ComparisonOperator =
  | 'contains'
  | 'equals'
  | 'number_equals'
  | 'greater_than'
  | 'less_than'
  | 'starts_with'
  | 'not_starts_with'
  | 'is_empty'
  | 'is_not_empty';

export interface Condition {
  logicalOperator?: LogicalOperator;
  variable: string;
  operator: ComparisonOperator;
  value: string;
}

export interface RouteMap {
  [key: string]: {
    conditions: Condition[];
  };
}

export interface RouterNodeData {
  color?: string;
  config: {
    route_map: RouteMap;
    input_schema?: Record<string, string>;
    output_schema?: Record<string, string>;
    title?: string;
  };
}

export interface RouterNodeProps {
    id: string;
    data: RouterNodeData;
    selected?: boolean;
};

export const OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'number_equals', label: 'Number Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'not_starts_with', label: 'Does Not Start With' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

export const DEFAULT_CONDITION: Condition = {
  variable: '',
  operator: 'contains',
  value: '',
};

export const DEFAULT_ROUTE = {
  conditions: [{ ...DEFAULT_CONDITION }],
};

