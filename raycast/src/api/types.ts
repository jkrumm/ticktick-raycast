export interface VikunjaTask {
  id: number;
  identifier: string;
  title: string;
  description: string;
  done: boolean;
  done_at: string | null;
  priority: number; // 0=none 1=low 2=medium 3=high 4=very_high 5=urgent
  labels: VikunjaLabel[];
  assignees: VikunjaUser[];
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  percent_done: number;
  hex_color: string;
  is_favorite: boolean;
  is_unread: boolean;
  comment_count: number;
  position: number;
  project_id: number;
  index: number;
  created: string;
  updated: string;
  created_by: VikunjaUser;
}

export interface VikunjaProject {
  id: number;
  title: string;
  description: string;
  hex_color: string;
  is_archived: boolean;
  parent_project_id: number;
  identifier: string;
}

export interface VikunjaLabel {
  id: number;
  title: string;
  hex_color: string;
}

export interface VikunjaUser {
  id: number;
  name: string;
  username: string;
}

export interface Preferences {
  apiToken: string;
  baseUrl: string;
  defaultProjectId?: string;
}
