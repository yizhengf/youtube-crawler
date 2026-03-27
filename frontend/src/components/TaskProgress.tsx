"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { getTaskStatus } from "@/lib/api";
import { TaskItem } from "@/lib/types";

interface TaskContextValue {
  tasks: TaskItem[];
  activeTask: TaskItem | null;
  isActive: boolean;
}

const TaskContext = createContext<TaskContextValue>({
  tasks: [],
  activeTask: null,
  isActive: false,
});

export function useTaskStatus() {
  return useContext(TaskContext);
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const poll = useCallback(async () => {
    try {
      const items = await getTaskStatus();
      setTasks(items);
    } catch {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  const activeTask = tasks.find((t) => t.status === "running") ?? null;
  const isActive = activeTask !== null;

  return (
    <TaskContext.Provider value={{ tasks, activeTask, isActive }}>
      {children}
    </TaskContext.Provider>
  );
}

export default function TaskProgress() {
  const { activeTask, isActive } = useTaskStatus();

  if (!isActive || !activeTask) return null;

  const percent =
    activeTask.progress_total && activeTask.progress_current
      ? Math.round((activeTask.progress_current / activeTask.progress_total) * 100)
      : null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">
            {activeTask.type || "Processing"}
          </p>
          {activeTask.message && (
            <p className="text-xs text-blue-600 mt-0.5">{activeTask.message}</p>
          )}
        </div>
        {percent !== null && (
          <span className="text-sm font-medium text-blue-700">
            {percent}%
          </span>
        )}
      </div>
      {percent !== null && (
        <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
