"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createStoryJobFromVideo,
  getAnalysisOverview,
  getAnalysisStatus,
  getChannels,
  runJob,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import { AnalysisOverview, AnalysisStatus, Channel } from "@/lib/types";

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {subtext ? <div className="mt-2 text-xs leading-5 text-gray-500">{subtext}</div> : null}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function AnalysisPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [overview, setOverview] = useState<AnalysisOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingVideoId, setCreatingVideoId] = useState<number | null>(null);

  const loadOverview = useCallback(async (channelId?: string) => {
    setLoading(true);
    try {
      const data = await getAnalysisOverview(channelId || undefined);
      setOverview(data);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getAnalysisStatus().then(setStatus).catch(() => {
      setStatus({
        status: "available",
        message: "第一版 AI 分析已啟用，可先看爆款排行、標題規律與內容建議。",
      });
    });
    getChannels().then(setChannels).catch(() => setChannels([]));
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadOverview(selectedChannelId || undefined);
  }, [loadOverview, selectedChannelId]);

  const titlePatterns = overview?.title_patterns ?? {
    avg_title_length: 0,
    question_title_ratio: 0,
    digit_title_ratio: 0,
    top_keywords: [],
  };

  const toPercent = (value: number) => `${Math.round(value * 100)}%`;

  const handleCreateStoryJob = async (videoId: number) => {
    setCreatingVideoId(videoId);
    try {
      const job = await createStoryJobFromVideo(videoId);
      await runJob(job.id);
      showToast("success", "已建立並開始執行仿寫故事影片任務");
      router.push(`/jobs/${job.id}`);
    } catch (error: unknown) {
      showToast("error", `建立任務失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setCreatingVideoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI 分析</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">
            第一版先用低成本規則分析，幫你看頻道概覽、爆款影片排行、標題規律與可執行的內容建議。
          </p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {status?.status || "available"}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">分析範圍</p>
            <p className="mt-1 text-sm text-gray-500">{status?.message || "功能已啟用"}</p>
          </div>
          <div className="w-full md:w-80">
            <label className="mb-1 block text-sm font-medium text-gray-700">選擇對標頻道</label>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部頻道總覽</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.channel_id || ""}>
                  {channel.handle || channel.channel_id || channel.url}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="分析頻道數" value={overview?.total_channels ?? 0} />
        <StatCard label="分析影片數" value={overview?.total_videos ?? 0} />
        <StatCard
          label="平均觀看數"
          value={overview?.avg_view_count != null ? Math.round(overview.avg_view_count).toLocaleString() : "-"}
        />
        <StatCard
          label="最高觀看影片"
          value={overview?.top_video_views != null ? overview.top_video_views.toLocaleString() : "-"}
          subtext={overview?.top_video_title || "尚無資料"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">爆款影片排行</h2>
              {loading ? <span className="text-xs text-gray-400">更新中...</span> : null}
            </div>
            <div className="mt-4 space-y-3">
              {overview?.top_videos.length ? (
                overview.top_videos.map((video, index) => (
                  <div
                    key={video.id}
                    className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/30"
                  >
                    <div className="text-xs font-semibold text-blue-600">TOP {index + 1}</div>
                    <a
                      href={video.url || `https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sm font-medium text-gray-900 hover:text-blue-700"
                    >
                      {video.title || video.video_id}
                    </a>
                    <div className="mt-2 text-xs text-gray-500">
                      觀看數：{video.view_count?.toLocaleString() || "-"} ・ 按讚數：{video.like_count?.toLocaleString() || "-"}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => handleCreateStoryJob(video.id)}
                        disabled={creatingVideoId === video.id}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {creatingVideoId === video.id ? "建立中..." : "一鍵建立仿寫任務"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">目前沒有足夠影片資料可供分析。</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">對標頻道表現</h2>
            <div className="mt-4 space-y-3">
              {overview?.top_channels.length ? (
                overview.top_channels.map((channel) => (
                  <div key={channel.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-900">
                      {channel.handle || channel.channel_id || channel.url}
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-gray-500 md:grid-cols-3">
                      <div>影片數：{channel.video_count}</div>
                      <div>平均觀看：{channel.avg_view_count != null ? Math.round(channel.avg_view_count).toLocaleString() : "-"}</div>
                      <div>最高觀看：{channel.top_video_views?.toLocaleString() || "-"}</div>
                    </div>
                    {channel.top_video_title ? (
                      <div className="mt-2 text-xs text-gray-600">代表作：{channel.top_video_title}</div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">還沒有可比較的頻道資料。</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">標題規律</h2>
            <div className="mt-4 grid gap-3">
              <MetricRow label="平均標題長度" value={`${titlePatterns.avg_title_length} 字`} />
              <MetricRow label="提問句比例" value={toPercent(titlePatterns.question_title_ratio)} />
              <MetricRow label="含數字比例" value={toPercent(titlePatterns.digit_title_ratio)} />
            </div>
            <div className="mt-5">
              <div className="text-sm font-medium text-gray-700">高頻關鍵詞</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {titlePatterns.top_keywords.length ? (
                  titlePatterns.top_keywords.map((item) => (
                    <span key={item.keyword} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                      {item.keyword} · {item.count}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">尚無足夠標題樣本</span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">可執行建議</h2>
            <div className="mt-4 space-y-3">
              {overview?.recommendations.length ? (
                overview.recommendations.map((item, index) => (
                  <div key={`${index}-${item}`} className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">等影片資料更多一點後，這裡會產出建議。</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
