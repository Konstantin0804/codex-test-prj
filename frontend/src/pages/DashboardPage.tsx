import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  createTask,
  fetchTasks,
  fetchTaskStats,
  removeTask,
  updateTaskStatus
} from "../features/tasks/tasksSlice";
import type { TaskPayload, TaskStatus } from "../features/tasks/types";
import {
  selectError,
  selectLoading,
  selectTaskStats,
  selectTasks
} from "../features/summary/selectors";
import { AppHeader } from "../components/AppHeader";
import { KpiCards } from "../components/KpiCards";
import { TaskComposer } from "../components/TaskComposer";
import { TaskBoard } from "../components/TaskBoard";

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectTasks);
  const stats = useAppSelector(selectTaskStats);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);

  useEffect(() => {
    void dispatch(fetchTasks());
    void dispatch(fetchTaskStats());
  }, [dispatch]);

  const refreshStats = async () => {
    await dispatch(fetchTaskStats());
  };

  const handleCreate = async (payload: TaskPayload) => {
    await dispatch(createTask(payload));
    await refreshStats();
  };

  const handleMove = async (id: number, status: TaskStatus) => {
    await dispatch(updateTaskStatus({ id, status }));
    await refreshStats();
  };

  const handleDelete = async (id: number) => {
    await dispatch(removeTask(id));
    await refreshStats();
  };

  return (
    <main className="layout">
      <AppHeader />
      <KpiCards stats={stats} />
      {loading ? <p className="status">Loading tasks...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <section className="main-grid">
        <TaskComposer onSubmit={handleCreate} />
        <TaskBoard tasks={tasks} onMove={handleMove} onDelete={handleDelete} />
      </section>
    </main>
  );
}
