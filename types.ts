
export interface VariableMapping {
  id: string;
  originalText: string;
  replacementText: string;
  label: string;
}

export interface Template {
  id: string;
  name: string;
  originalHtml: string;
  mappings: VariableMapping[];
  updatedAt: number;
}

export type AppView = 'dashboard' | 'editor' | 'viewer';
