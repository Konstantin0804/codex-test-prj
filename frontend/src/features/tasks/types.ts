export type TaskStatus = "backlog" | "in_progress" | "done";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  estimate_hours: number;
  due_date: string;
  created_at: string;
}

export interface TaskStats {
  total: number;
  backlog: number;
  in_progress: number;
  done: number;
  avg_priority: number;
  completion_rate: number;
}

export interface TaskPayload {
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  estimate_hours: number;
  due_date: string;
}
