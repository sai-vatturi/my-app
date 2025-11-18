export enum ReleaseType {
  MAJOR_RELEASE = 'Major release',
  HOTFIX = 'Hotfix',
  DATA_PATCH = 'Data patch',
  HOTFIX_DATA_PATCH = 'Hotfix & Data patch'
}

import { WorkflowStageState } from './workflow.model';

export interface FixedVersionInfo {
  fixed_version: string;
  jira_board_id: string;
}

export interface ReleaseProduct {
  product_id: string;
  scope_description?: string;
  pocs: string[];
  fixed_versions: FixedVersionInfo[];
  workflow_states?: { [key: string]: WorkflowStageState };
}

export interface Release {
  id?: string;  // Optional for compatibility
  _id?: string; // Backend returns _id
  name: string;
  description?: string;
  release_date: string;
  release_type: ReleaseType;
  status: string; // planned, in_progress, completed, cancelled
  overall_scope?: string;
  jira_release_version?: string;
  chg_number?: string;
  products: ReleaseProduct[];  // Products in the release
  created_at: string;
  updated_at: string;
}

export interface ReleaseCreate {
  name: string;
  description?: string;
  release_date: string;
  release_type: ReleaseType;
  status?: string;
  overall_scope?: string;
  jira_release_version?: string;
  chg_number?: string;
  products?: ReleaseProduct[];
}

export interface ReleaseUpdate {
  name?: string;
  description?: string;
  release_date?: string;
  release_type?: ReleaseType;
  status?: string;
  overall_scope?: string;
  jira_release_version?: string;
  chg_number?: string;
  products?: ReleaseProduct[];
}
