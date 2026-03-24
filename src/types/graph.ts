export type GraphNodeType = "person" | "skill" | "project" | "education" | "certificate" | "document" | "role" | "tool" | "user" | "issue" | "label";

export type GraphLinkType =
  | "HAS_SKILL" | "WORKED_ON" | "COMPLETED" | "EARNED"
  | "AUTHORED" | "HAS_ROLE" | "USES_TOOL" | "USED_IN"
  // 레거시 호환
  | "ASSIGNED_TO" | "LABELED_WITH" | "CREATED_BY";

export interface GraphNode {
  id: string;
  name: string;
  type: GraphNodeType;
  meta?: {
    [key: string]: string | number | undefined;
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
  nodeTypes: Record<string, boolean>;
  linkTypes: Record<string, boolean>;
  search: string;
}

export type SelectedNode = GraphNode | null;
