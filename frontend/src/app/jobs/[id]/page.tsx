"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import TaskProgress from "@/components/TaskProgress";
import { useTaskStatus } from "@/components/TaskProgress";
import { useToast } from "@/components/Toast";
import { approveJob, getJob, rejectJob, retryJob, runJob } from "@/lib/api";
import { JobDetail } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function statusTone(status: string) {
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

function resolveAssetUrl(sourceUrl: string | null) {
  if (!sourceUrl) return null;
  return sourceUrl.startsWith("http") ? sourceUrl : `${API_BASE}${sourceUrl}`;
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { isActive } = useTaskStatus();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const jobId = Number(params.id);

  const fetchJob = useCallback(async () => {
    try {
      const data = await getJob(jobId);
      setJob(data);
    } catch (e: unknown) {
      showToast("error", `載入任務失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    } finally {
      setLoading(false);
    }
  }, [jobId, showToast]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (!job) return;
    const shouldPoll =
      isActive ||
      job.status === "queued" ||
      job.status === "running" ||
      job.status === "pending_review";
    if (!shouldPoll) return;
    const interval = setInterval(fetchJob, 2000);
    return () => clearInterval(interval);
  }, [fetchJob, isActive, job]);

  const perform = async (action: "run" | "retry" | "approve" | "reject") => {
    try {
      if (action === "run") await runJob(jobId);
      if (action === "retry") await retryJob(jobId);
      if (action === "approve") await approveJob(jobId);
      if (action === "reject") await rejectJob(jobId);
      showToast("success", "操作成功");
      fetchJob();
    } catch (e: unknown) {
      showToast("error", `操作失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        載入中...
      </div>
    );
  }

  if (!job) {
    return <div className="text-gray-500">找不到任務。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(job.status)}`}>
              {job.status}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {job.review_status}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{job.current_step || "尚未開始"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => perform("run")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            執行
          </button>
          <button onClick={() => perform("retry")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            重跑
          </button>
          <button onClick={() => perform("approve")} className="rounded-lg border border-green-300 px-4 py-2 text-sm text-green-700 hover:bg-green-50">
            通過審核
          </button>
          <button onClick={() => perform("reject")} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
            駁回
          </button>
        </div>
      </div>

      <TaskProgress />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">任務資訊</h2>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div><span className="text-gray-500">類型：</span>{job.job_type}</div>
              <div><span className="text-gray-500">Provider：</span>{job.provider || "-"}</div>
              <div><span className="text-gray-500">主題：</span>{job.topic || "-"}</div>
              <div><span className="text-gray-500">比例：</span>{job.aspect_ratio || "-"}</div>
              <div><span className="text-gray-500">語言：</span>{job.language || "-"}</div>
              <div><span className="text-gray-500">目標秒數：</span>{job.target_duration || "-"}</div>
            </div>
            {job.description && (
              <div className="mt-4">
                <p className="mb-1 text-sm font-medium text-gray-700">描述</p>
                <p className="whitespace-pre-wrap text-sm text-gray-600">{job.description}</p>
              </div>
            )}
            {job.prompt && (
              <div className="mt-4">
                <p className="mb-1 text-sm font-medium text-gray-700">Prompt</p>
                <p className="whitespace-pre-wrap text-sm text-gray-600">{job.prompt}</p>
              </div>
            )}
            {job.error_message && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {job.error_message}
              </div>
            )}
            {job.result_summary && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {job.result_summary}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">腳本與分鏡</h2>
            <div className="mt-4 space-y-4">
              {job.scripts.length === 0 ? (
                <p className="text-sm text-gray-500">尚未產生腳本。</p>
              ) : (
                job.scripts.map((script) => (
                  <div key={script.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{script.script_type}</h3>
                      <span className="text-xs text-gray-400">v{script.version}</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-600">{script.content}</pre>
                    {script.segments.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {script.segments.map((segment) => (
                          <div key={segment.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                            <div className="font-medium text-gray-800">段落 {segment.segment_index}</div>
                            <p className="mt-1 whitespace-pre-wrap text-gray-600">{segment.text}</p>
                            {segment.image_prompt && (
                              <p className="mt-2 text-xs text-gray-500">Image Prompt：{segment.image_prompt}</p>
                            )}
                            {segment.video_prompt && (
                              <p className="mt-1 text-xs text-gray-500">Video Prompt：{segment.video_prompt}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">來源影片</h2>
            {job.source_video ? (
              <div className="mt-4 space-y-3 text-sm">
                <a
                  href={job.source_video.url || `https://www.youtube.com/watch?v=${job.source_video.video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {job.source_video.title || job.source_video.video_id}
                </a>
                <div className="text-gray-500">觀看數：{job.source_video.view_count?.toLocaleString() || "-"}</div>
                <div className="text-gray-500">按讚數：{job.source_video.like_count?.toLocaleString() || "-"}</div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">此任務沒有綁定來源影片。</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">生成任務</h2>
            <div className="mt-4 space-y-3">
              {job.generation_tasks.length === 0 ? (
                <p className="text-sm text-gray-500">尚未建立外部生成任務。</p>
              ) : (
                job.generation_tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                    <div className="font-medium text-gray-800">{task.task_type}</div>
                    <div className="mt-1 text-gray-500">Provider：{task.provider || "-"}</div>
                    <div className="text-gray-500">狀態：{task.status}</div>
                    {task.response_payload && (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-500">{task.response_payload}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">產出資產</h2>
            <div className="mt-4 space-y-3">
              {job.assets.length === 0 ? (
                <p className="text-sm text-gray-500">尚未產生資產。</p>
              ) : (
                job.assets.map((asset) => (
                  <div key={asset.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-800">{asset.asset_type}</div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(asset.status)}`}>
                        {asset.status}
                      </span>
                    </div>
                    <div className="text-gray-500">Provider：{asset.provider || "-"}</div>
                    {asset.source_url && (
                      <>
                        <a
                          href={resolveAssetUrl(asset.source_url) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block text-blue-600 hover:underline"
                        >
                          開啟資產連結
                        </a>
                        {asset.asset_type === "audio" && (
                          <audio
                            controls
                            className="mt-3 w-full"
                            src={resolveAssetUrl(asset.source_url) || undefined}
                          />
                        )}
                        {asset.asset_type === "subtitle" && (
                          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                            <p className="font-medium text-gray-700">字幕檔已生成</p>
                            <p className="mt-1">
                              可直接開啟 `.srt` 檔確認字幕時間軸，之後也可下載給剪輯流程使用。
                            </p>
                          </div>
                        )}
                        {asset.asset_type === "video" && (
                          <video
                            controls
                            className="mt-3 w-full rounded-lg border border-gray-200"
                            src={resolveAssetUrl(asset.source_url) || undefined}
                          />
                        )}
                      </>
                    )}
                    {asset.metadata_json && (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-500">{asset.metadata_json}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <div>
        <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
          返回任務列表
        </Link>
      </div>
    </div>
  );
}
