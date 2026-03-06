import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../shared/api";
import type { Task, TaskPayload, TaskStats, TaskStatus } from "./types";

interface TasksState {
  items: Task[];
  stats: TaskStats | null;
  loading: boolean;
  creating: boolean;
  movingIds: number[];
  deletingIds: number[];
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  stats: null,
  loading: false,
  creating: false,
  movingIds: [],
  deletingIds: [],
  error: null
};

export const fetchTasks = createAsyncThunk("tasks/fetch", async () => {
  const response = await api.get<Task[]>("/tasks");
  return response.data;
});

export const fetchTaskStats = createAsyncThunk("tasks/stats", async () => {
  const response = await api.get<TaskStats>("/tasks/stats");
  return response.data;
});

export const createTask = createAsyncThunk(
  "tasks/create",
  async (payload: TaskPayload) => {
    const response = await api.post<Task>("/tasks", payload);
    return response.data;
  }
);

export const updateTaskStatus = createAsyncThunk(
  "tasks/updateStatus",
  async ({ id, status }: { id: number; status: TaskStatus }) => {
    const response = await api.patch<Task>(`/tasks/${id}/status`, { status });
    return response.data;
  }
);

export const removeTask = createAsyncThunk("tasks/remove", async (id: number) => {
  await api.delete(`/tasks/${id}`);
  return id;
});

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load tasks";
      })
      .addCase(fetchTaskStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(createTask.pending, (state) => {
        state.creating = true;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.creating = false;
        state.items.unshift(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.creating = false;
        state.error = action.error.message ?? "Failed to create task";
      })
      .addCase(updateTaskStatus.pending, (state, action) => {
        if (!state.movingIds.includes(action.meta.arg.id)) {
          state.movingIds.push(action.meta.arg.id);
        }
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.movingIds = state.movingIds.filter((id) => id !== action.payload.id);
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.movingIds = state.movingIds.filter((id) => id !== action.meta.arg.id);
        state.error = action.error.message ?? "Failed to move task";
      })
      .addCase(removeTask.pending, (state, action) => {
        if (!state.deletingIds.includes(action.meta.arg)) {
          state.deletingIds.push(action.meta.arg);
        }
      })
      .addCase(removeTask.fulfilled, (state, action) => {
        state.deletingIds = state.deletingIds.filter((id) => id !== action.payload);
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(removeTask.rejected, (state, action) => {
        state.deletingIds = state.deletingIds.filter((id) => id !== action.meta.arg);
        state.error = action.error.message ?? "Failed to delete task";
      });
  }
});

export default tasksSlice.reducer;
