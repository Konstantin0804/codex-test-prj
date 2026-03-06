import type { TaskStats } from "../features/tasks/types";

interface Props {
  stats: TaskStats | null;
}

const empty = {
  total: 0,
  backlog: 0,
  in_progress: 0,
  done: 0,
  avg_priority: 0,
  completion_rate: 0
};

export function KpiCards({ stats }: Props) {
  const data = stats ?? empty;

  return (
    <section className="kpi-grid">
      <article className="card kpi-card">
        <p>Total</p>
        <h3>{data.total}</h3>
      </article>
      <article className="card kpi-card">
        <p>In Progress</p>
        <h3>{data.in_progress}</h3>
      </article>
      <article className="card kpi-card">
        <p>Done</p>
        <h3>{data.done}</h3>
      </article>
      <article className="card kpi-card accent">
        <p>Completion</p>
        <h3>{Math.round(data.completion_rate)}%</h3>
      </article>
    </section>
  );
}
