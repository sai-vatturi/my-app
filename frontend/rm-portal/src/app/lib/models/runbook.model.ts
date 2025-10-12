export interface RunbookStep {
  order: number;
  title: string;
  description: string;
  responsible_squad?: string;
  estimated_duration_minutes?: number;
}

export interface Runbook {
  _id: string;
  release_id: string;
  title: string;
  description?: string;
  steps: RunbookStep[];
  created_at: string;
  updated_at: string;
}

export interface RunbookCreateDto {
  release_id: string;
  title: string;
  description?: string;
  steps?: RunbookStep[];
}

export interface RunbookUpdateDto {
  title?: string;
  description?: string;
  steps?: RunbookStep[];
}
