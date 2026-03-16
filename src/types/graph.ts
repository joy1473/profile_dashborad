export type GraphNodeType = "user" | "issue" | "label";

export type GraphLinkType = "ASSIGNED_TO" | "LABELED_WITH" | "CREATED_BY";

export interface GraphNode {
  id: string;
  name: string;
  type: GraphNodeType;
  meta?: {
    email?: string;
    role?: string;
    status?: string;
    priority?: string;
    color?: string;
    [key: string]: string | undefined;
  };
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: GraphLinkType;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphFilterState {
  nodeTypes: Record<GraphNodeType, boolean>;
  linkTypes: Record<GraphLinkType, boolean>;
  search: string;
}

export type SelectedNode = GraphNode | null;
