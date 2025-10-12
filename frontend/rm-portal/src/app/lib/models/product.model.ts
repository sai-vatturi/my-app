export interface JiraBoardInfo {
  board_id: string;
  board_name: string;
  fixed_version?: string;
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  product_owner?: string;
  technical_lead?: string;
  jira_boards: JiraBoardInfo[];
  squads: string[];
  fixed_versions?: string[];
  created_at: string;
  updated_at: string;
}

export interface ProductCreateDto {
  name: string;
  description?: string;
  product_owner?: string;
  technical_lead?: string;
  jira_boards?: JiraBoardInfo[];
  squads?: string[];
  fixed_versions?: string[];
}

export interface ProductUpdateDto {
  name?: string;
  description?: string;
  product_owner?: string;
  technical_lead?: string;
  jira_boards?: JiraBoardInfo[];
  squads?: string[];
  fixed_versions?: string[];
}
