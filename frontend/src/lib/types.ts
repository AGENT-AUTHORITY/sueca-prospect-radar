export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface ScoreReason {
  points: number;
  reason: string;
  category?: string | null;
}

export interface Prospect {
  id: number;
  company_name: string;
  normalized_name: string;
  industry: string | null;
  subindustry: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  website_domain: string | null;
  google_maps_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  source: string | null;
  source_url: string | null;
  search_query: string | null;
  priority: Priority;
  score: number;
  data_confidence: number;
  score_breakdown: ScoreReason[] | null;
  signals: Record<string, boolean | string | string[]> | null;
  status: string;
  assigned_to: string | null;
  contact_name: string | null;
  contact_role: string | null;
  fleet_signal: boolean;
  fleet_size_estimate: string | null;
  fleet_notes: string | null;
  potential_truck_application: string | null;
  volvo_family: string | null;
  truck_application_notes: string | null;
  commercial_reason: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}

export interface MapPoint {
  id: number;
  company_name: string;
  industry: string | null;
  city: string | null;
  score: number;
  priority: Priority;
  status: string;
  volvo_family: string | null;
  lat: number;
  lon: number;
}

export interface Metrics {
  prospects_found: number;
  high_priority: number;
  contacted: number;
  meetings: number;
  opportunities: number;
  won: number;
  avg_score: number;
  by_industry: Record<string, number>;
  by_status: Record<string, number>;
  by_volvo: Record<string, number>;
}

export interface DashboardData {
  metrics: Metrics;
  system_online: boolean;
  active_runs: number[];
  active_territory: string;
  recent_runs: {
    id: number;
    location: string;
    status: string;
    new_companies: number;
    companies_found: number;
    started_at: string | null;
  }[];
}

export interface Industry {
  id: number;
  key: string;
  label: string;
  active: boolean;
  base_weight: number;
}

export interface Location {
  id: number;
  name: string;
  province: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

export interface SearchRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  territory: string | null;
  location: string | null;
  radius: number | null;
  industries: string[] | null;
  max_results: number | null;
  queries_generated: number;
  queries_completed: number;
  companies_found: number;
  new_companies: number;
  duplicates: number;
  errors: number;
  status: string;
}

export interface SearchEvent {
  id: number;
  run_id: number;
  ts: string;
  type: string;
  level: string;
  message: string;
  payload: Record<string, unknown> | null;
  prospect_id: number | null;
}

export interface Note {
  id: number;
  body: string;
  author: string | null;
  created_at: string;
}

export interface HistoryEntry {
  id: number;
  action: string;
  old_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
}

export interface StartSearchBody {
  location: string;
  territory?: string | null;
  radius?: number | null;
  industries: string[];
  max_results?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  refresh?: boolean;
}
