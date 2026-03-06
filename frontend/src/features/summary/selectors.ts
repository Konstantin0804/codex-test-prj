import type { RootState } from "../../app/store";

export const selectTasks = (state: RootState) => state.tasks.items;
export const selectTaskStats = (state: RootState) => state.tasks.stats;
export const selectLoading = (state: RootState) => state.tasks.loading;
export const selectCreating = (state: RootState) => state.tasks.creating;
export const selectMovingIds = (state: RootState) => state.tasks.movingIds;
export const selectDeletingIds = (state: RootState) => state.tasks.deletingIds;
export const selectError = (state: RootState) => state.tasks.error;
