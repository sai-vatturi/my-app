export interface WorkflowStage {
  name: string;
  order: number;
  description?: string;
  requires_attachment: boolean;
  attachment_mandatory: boolean;
  default_days_before_release: number;
}

export interface Workflow {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  stages: WorkflowStage[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowCreate {
  name: string;
  description?: string;
  stages: WorkflowStage[];
}

export interface WorkflowUpdate {
  name?: string;
  description?: string;
  stages?: WorkflowStage[];
}

export interface ProductWorkflowState {
  current_stage_index: number;
  stage_dates: { [stageIndex: string]: string }; // ISO date strings
  attachments: { [stageIndex: string]: string[] }; // File IDs
}
