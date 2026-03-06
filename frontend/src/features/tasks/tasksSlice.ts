import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../shared/api";
import type { Task, TaskPayload, TaskStats, TaskStatus } from "./types";

interface TasksState {
  items: Task[];
  stats: TaskStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  stats: null,
  loading: false,
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
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) {
          state.items[index] = action.payload;
        }
      })
      .addCase(removeTask.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      });
  }
});

export default tasksSlice.reducer;
