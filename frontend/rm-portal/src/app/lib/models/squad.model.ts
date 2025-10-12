export interface Squad {
  _id: string;
  name: string;
  description?: string;
  team_members?: string[];
  created_at: string;
  updated_at: string;
}

export interface SquadCreateDto {
  name: string;
  description?: string;
  team_members?: string[];
}

export interface SquadUpdateDto {
  name?: string;
  description?: string;
  team_members?: string[];
}
