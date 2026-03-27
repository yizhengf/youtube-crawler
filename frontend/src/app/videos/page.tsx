"use client";

import { useEffect, useState, useCallback } from "react";
import { getVideos, getChannels, syncVideosToNotion } from "@/lib/api";
import { Video, Channel } from "@/lib/types";
import VideoTable from "@/components/VideoTable";
import Pagination from "@/components/Pagination";
import TaskProgress from "@/components/TaskProgress";
import { useToast } from "@/components/Toast";

export default function AllVideosPage() {
  const { showToast } = useToast();

  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
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
  }, [fetchChannels]);

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">所有影片</h1>
        <button
          onClick={handleSyncNotion}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          同步到 Notion
        </button>
      </div>

      <TaskProgress />

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
        />
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
