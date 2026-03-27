"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getVideos, getChannels, syncVideosToNotion } from "@/lib/api";
import { Video, Channel } from "@/lib/types";
import VideoTable from "@/components/VideoTable";
import Pagination from "@/components/Pagination";
import TaskProgress from "@/components/TaskProgress";
import { useToast } from "@/components/Toast";

export default function ChannelVideosPage() {
  const params = useParams();
  const channelId = Number(params.id);
  const { showToast } = useToast();

  const [videos, setVideos] = useState<Video[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState("published_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchVideos = useCallback(async () => {
    if (!channel) return;
    setLoading(true);
    try {
      const res = await getVideos({
        channel_id: channel.channel_id || undefined,
        page,
        page_size: 20,
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setVideos(res.items);
      setTotalPages(res.total_pages);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [channel, page, search, sortBy, sortOrder]);

  const fetchChannel = useCallback(async () => {
    try {
      const channels = await getChannels();
      const ch = channels.find((c) => c.id === channelId);
      setChannel(ch || null);
    } catch {
      // ignore
    }
  }, [channelId]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

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

  return (
    <div>
      {channel && (
        <div className="mb-4">
          <h1 className="text-2xl font-bold">
            {channel.handle || "Channel Videos"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {channel.channel_id || ""} · {channel.video_count.toLocaleString()} 部影片
          </p>
        </div>
      )}

      <TaskProgress />

      <div className="flex items-center justify-between mb-4">
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
        <button
          onClick={handleSyncNotion}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          同步到 Notion
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <VideoTable
          videos={videos}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
