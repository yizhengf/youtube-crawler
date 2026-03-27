"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import TaskProgress from "@/components/TaskProgress";
import { useTaskStatus } from "@/components/TaskProgress";
import { useToast } from "@/components/Toast";
import { getJobs, retryJob, runJob } from "@/lib/api";
import { Job } from "@/lib/types";

function typeLabel(jobType: Job["job_type"]) {
  return jobType === "story_rewrite" ? "仿寫故事影片" : "AI 影片生成";
}

function statusClasses(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending_review":
      return "bg-amber-100 text-amber-800";
    case "running":
    case "queued":
      return "bg-blue-100 text-blue-800";
    case "failed":
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { isActive } = useTaskStatus();

  const fetchJobs = useCallback(async () => {
    try {
      const data = await getJobs();
      setJobs(data);
    } catch (e: unknown) {
      showToast("error", `載入任務失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(fetchJobs, 2000);
    return () => clearInterval(interval);
  }, [fetchJobs, isActive]);

  const handleRun = async (jobId: number) => {
    try {
      await runJob(jobId);
      showToast("success", "任務已開始執行");
      fetchJobs();
    } catch (e: unknown) {
      showToast("error", `執行失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  const handleRetry = async (jobId: number) => {
    try {
      await retryJob(jobId);
      showToast("success", "任務已重新執行");
      fetchJobs();
    } catch (e: unknown) {
      showToast("error", `重跑失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  const total = jobs.length;
  const completed = jobs.filter((job) => job.status === "completed").length;
  const pendingReview = jobs.filter((job) => job.status === "pending_review").length;
  const active = jobs.filter((job) => job.status === "running" || job.status === "queued").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">任務中心</h1>
          <p className="mt-1 text-sm text-gray-500">
            這一版先支援仿寫故事影片與 AI 影片生成兩種任務。
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
        >
          建立任務
        </Link>
      </div>

      <TaskProgress />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">全部任務</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{total}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">執行中</div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{active}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">待審核</div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{pendingReview}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">已完成</div>
          <div className="mt-2 text-2xl font-bold text-green-700">{completed}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            載入中...
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <p className="mb-2 text-lg">尚無任務</p>
            <p className="text-sm">可從影片資料庫直接建立，或在這裡手動新增</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">任務</th>
                  <th className="px-4 py-3 font-medium">類型</th>
                  <th className="px-4 py-3 font-medium">狀態</th>
                  <th className="px-4 py-3 font-medium">審核</th>
                  <th className="px-4 py-3 font-medium">目前步驟</th>
                  <th className="px-4 py-3 font-medium">更新時間</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => (
                  <tr
                    key={job.id}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium text-blue-600 hover:underline">
                        {job.title}
                      </Link>
                      {job.result_summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{job.result_summary}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{typeLabel(job.job_type)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{job.review_status}</td>
                    <td className="px-4 py-3 text-gray-600">{job.current_step || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{job.updated_at?.slice(0, 19).replace("T", " ") || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRun(job.id)}
                          className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          執行
                        </button>
                        <button
                          onClick={() => handleRetry(job.id)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          重跑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
