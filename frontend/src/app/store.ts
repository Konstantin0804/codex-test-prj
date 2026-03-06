import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import tasksReducer from "../features/tasks/tasksSlice";
import surfReducer from "../features/surf/surfSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
    surf: surfReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
