import type { Task, TaskStatus } from "../features/tasks/types";

interface Props {
  tasks: Task[];
  onMove: (id: number, status: TaskStatus) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const columns: { key: TaskStatus; title: string }[] = [
  { key: "backlog", title: "Backlog" },
  { key: "in_progress", title: "In Progress" },
  { key: "done", title: "Done" }
];

const nextStatus: Record<TaskStatus, TaskStatus> = {
  backlog: "in_progress",
  in_progress: "done",
  done: "backlog"
};

const statusLabel: Record<TaskStatus, string> = {
  backlog: "Start",
  in_progress: "Complete",
  done: "Reopen"
};

export function TaskBoard({ tasks, onMove, onDelete }: Props) {
  return (
    <section className="board">
      {columns.map((column) => {
        const filtered = tasks.filter((task) => task.status === column.key);

        return (
          <article className="card column" key={column.key}>
            <div className="column-head">
              <h3>{column.title}</h3>
              <span>{filtered.length}</span>
            </div>
            <div className="stack">
              {filtered.map((task) => (
                <div className="task" key={task.id}>
                  <h4>{task.title}</h4>
                  <p>{task.description || "No details provided"}</p>
                  <div className="meta">
                    <span>P{task.priority}</span>
                    <span>{task.estimate_hours}h</span>
                    <span>{task.due_date}</span>
                  </div>
                  <div className="actions">
                    <button onClick={() => onMove(task.id, nextStatus[task.status])}>
                      {statusLabel[task.status]}
                    </button>
                    <button className="ghost" onClick={() => onDelete(task.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
