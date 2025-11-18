export interface WorkflowStage {
  name: string;
  order: number;
  description?: string;
  requires_attachment: boolean;
  attachment_mandatory: boolean;
  default_days_before_release: number;
}

export interface WorkflowStageState {
  status: boolean;
  completed_at?: string;
  attachment_id?: string;
  attachment_filename?: string;
  attachment_uploaded_at?: string;
  deadline?: string;
}

export interface WorkflowTemplate {
  id?: string;
  _id?: string;
  name: string;
  release_type: string;
  is_default: boolean;
  stages: WorkflowStage[];
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowTemplateCreate {
  name: string;
  release_type: string;
  stages: WorkflowStage[];
  is_default?: boolean;
}

export interface WorkflowTemplateUpdate {
  name?: string;
  release_type?: string;
  stages?: WorkflowStage[];
}

