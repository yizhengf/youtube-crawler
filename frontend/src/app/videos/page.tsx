"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createAiVideoJobFromVideo,
  createStoryJobFromVideo,
  getVideoStats,
  getVideos,
  getChannels,
  runJob,
  syncVideosToNotion,
} from "@/lib/api";
import { Video, Channel, VideoStats } from "@/lib/types";
import VideoTable from "@/components/VideoTable";
import Pagination from "@/components/Pagination";
import TaskProgress, { useTaskStatus } from "@/components/TaskProgress";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";

export default function AllVideosPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isActive } = useTaskStatus();

  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState("published_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [channelFilter, setChannelFilter] = useState<string | undefined>(
    undefined
  );

  const fetchChannels = useCallback(async () => {
    try {
      const data = await getChannels();
      setChannels(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getVideoStats();
      setStats(data);
    } catch {
      setStats(null);
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVideos({
        page,
        page_size: 20,
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        channel_id: channelFilter,
      });
      setVideos(res.items);
      setTotalPages(res.total_pages);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder, channelFilter]);

  useEffect(() => {
    fetchChannels();
    fetchStats();
  }, [fetchChannels, fetchStats]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      fetchVideos();
      fetchStats();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchVideos, isActive]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSyncNotion = async () => {
    try {
      await syncVideosToNotion();
      showToast("success", "已開始同步到 Notion");
    } catch (e: unknown) {
      showToast("error", `同步失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  const handleCreateStoryJob = async (video: Video) => {
    try {
      const job = await createStoryJobFromVideo(video.id);
      await runJob(job.id);
      showToast("success", "已建立並開始執行仿寫故事影片任務");
      router.push(`/jobs/${job.id}`);
    } catch (e: unknown) {
      showToast("error", `建立任務失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  const handleCreateAiJob = async (video: Video) => {
    try {
      const job = await createAiVideoJobFromVideo(video.id);
      await runJob(job.id);
      showToast("success", "已建立並開始執行 AI 影片生成任務");
      router.push(`/jobs/${job.id}`);
    } catch (e: unknown) {
      showToast("error", `建立任務失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">影片資料庫</h1>
          <p className="mt-1 text-sm text-gray-500">
            先挑研究樣本，再從影片直接建立仿寫或 AI 生成任務。
          </p>
        </div>
        <button
          onClick={handleSyncNotion}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          同步到 Notion
        </button>
      </div>

      <TaskProgress />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">影片總數</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{stats?.total_videos ?? videos.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">已完成爬蟲</div>
          <div className="mt-2 text-2xl font-bold text-green-700">{stats?.total_crawled ?? 0}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">平均觀看數</div>
          <div className="mt-2 text-2xl font-bold text-blue-700">
            {stats?.avg_view_count != null ? Math.round(stats.avg_view_count).toLocaleString() : "-"}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">平均按讚數</div>
          <div className="mt-2 text-2xl font-bold text-purple-700">
            {stats?.avg_like_count != null ? Math.round(stats.avg_like_count).toLocaleString() : "-"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜尋影片標題..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            搜尋
          </button>
        </form>
        <select
          value={channelFilter ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setChannelFilter(v ? v : undefined);
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">所有頻道</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.channel_id || ""}>
              {ch.handle || ch.url}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <VideoTable
          videos={videos}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          showChannel
          onCreateStoryJob={handleCreateStoryJob}
          onCreateAiJob={handleCreateAiJob}
        />
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
