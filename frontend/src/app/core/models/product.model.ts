export interface JiraBoardInfo {
  board_id: string;
  board_name: string;
}

export interface Product {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  product_owners?: string[];
  team_leads?: string[];
  principal_engineers?: string[];
  jira_boards: JiraBoardInfo[];
  squads?: string[];
  business_unit_id?: string;
  application_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  description?: string;
  product_owners?: string[];
  team_leads?: string[];
  principal_engineers?: string[];
  jira_boards?: JiraBoardInfo[];
  squads?: string[];
  business_unit_id?: string;
  application_ids?: string[];
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  product_owners?: string[];
  team_leads?: string[];
  principal_engineers?: string[];
  jira_boards?: JiraBoardInfo[];
  squads?: string[];
  business_unit_id?: string;
  application_ids?: string[];
}
