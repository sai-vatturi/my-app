export interface Squad {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  team_leads?: string[];
  principal_engineers?: string[];
  products?: string[];
  business_unit_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SquadCreate {
  name: string;
  description?: string;
  team_leads?: string[];
  principal_engineers?: string[];
  products?: string[];
}

export interface SquadUpdate {
  name?: string;
  description?: string;
  team_leads?: string[];
  principal_engineers?: string[];
  products?: string[];
}
