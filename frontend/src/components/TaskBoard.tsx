import { DragEvent, useState } from "react";
import type { Task, TaskStatus } from "../features/tasks/types";

interface Props {
  tasks: Task[];
  onMove: (id: number, status: TaskStatus) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  movingIds: number[];
  deletingIds: number[];
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

export function TaskBoard({ tasks, onMove, onDelete, movingIds, deletingIds }: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const onDragStart = (event: DragEvent<HTMLDivElement>, task: Task) => {
    if (movingIds.includes(task.id) || deletingIds.includes(task.id)) {
      event.preventDefault();
      return;
    }
    setDraggingId(task.id);
    event.dataTransfer.setData("text/task-id", String(task.id));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const onDropColumn = async (event: DragEvent<HTMLElement>, targetStatus: TaskStatus) => {
    event.preventDefault();
    setDropTarget(null);
    const value = event.dataTransfer.getData("text/task-id");
    const taskId = Number(value);
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === targetStatus) {
      return;
    }
    await onMove(task.id, targetStatus);
  };

  const onDragOverColumn = (event: DragEvent<HTMLElement>, targetStatus: TaskStatus) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(targetStatus);
  };

  return (
    <section className="board">
      {columns.map((column) => {
        const filtered = tasks.filter((task) => task.status === column.key);

        return (
          <article
            className={`card column ${dropTarget === column.key ? "column-drop" : ""}`}
            key={column.key}
            onDragOver={(event) => onDragOverColumn(event, column.key)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(event) => void onDropColumn(event, column.key)}
          >
            <div className="column-head">
              <h3>{column.title}</h3>
              <span>{filtered.length}</span>
            </div>
            <div className="stack">
              {filtered.map((task) => (
                <div
                  className={`task ${draggingId === task.id ? "task-dragging" : ""} ${
                    movingIds.includes(task.id) || deletingIds.includes(task.id) ? "task-busy" : ""
                  }`}
                  key={task.id}
                  draggable
                  onDragStart={(event) => onDragStart(event, task)}
                  onDragEnd={onDragEnd}
                >
                  <h4>{task.title}</h4>
                  <p>{task.description || "No details provided"}</p>
                  <div className="meta">
                    <span>P{task.priority}</span>
                    <span>{task.estimate_hours}h</span>
                    <span>{task.due_date}</span>
                  </div>
                  <div className="actions">
                    <button
                      disabled={movingIds.includes(task.id) || deletingIds.includes(task.id)}
                      onClick={() => onMove(task.id, nextStatus[task.status])}
                    >
                      {movingIds.includes(task.id) ? "Moving..." : statusLabel[task.status]}
                    </button>
                    <button
                      className="ghost"
                      disabled={movingIds.includes(task.id) || deletingIds.includes(task.id)}
                      onClick={() => onDelete(task.id)}
                    >
                      {deletingIds.includes(task.id) ? "Deleting..." : "Delete"}
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
