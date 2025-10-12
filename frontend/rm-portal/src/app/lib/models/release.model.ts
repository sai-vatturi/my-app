export interface FixedVersion {
  jira_board_id: string;
  fixed_version: string;
}

export interface ProductScope {
  product_id: string;
  scope_description: string;
  pocs: string[];
  fixed_versions: FixedVersion[];
}

export type ReleaseStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Release {
  _id: string;
  name: string;
  description?: string;
  release_date: string;
  status: ReleaseStatus;
  overall_scope?: string;
  jira_release_version?: string;
  chg_number?: string;
  release_type?: string;
  participating_products: string[];
  product_scopes: ProductScope[];
  created_at: string;
  updated_at: string;
}

export interface ReleaseCreateDto {
  name: string;
  description?: string;
  release_date: string;
  status?: string;
  overall_scope?: string;
  jira_release_version?: string;
  chg_number?: string;
  release_type?: string;
  participating_products: string[];
  product_scopes: ProductScope[];
}

export interface ReleaseUpdateDto {
  name?: string;
  description?: string;
  release_date?: string;
  status?: string;
  overall_scope?: string;
  jira_release_version?: string;
  chg_number?: string;
  release_type?: string;
  participating_products?: string[];
  product_scopes?: ProductScope[];
}
