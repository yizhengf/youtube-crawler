"use client";

import Sidebar from "@/components/Sidebar";
import { TaskProvider } from "@/components/TaskProgress";
import { ToastProvider } from "@/components/Toast";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <TaskProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-56 p-8">{children}</main>
        </div>
      </TaskProvider>
    </ToastProvider>
  );
}
