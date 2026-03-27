"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getChannels,
  createChannel,
  deleteChannel,
  crawlVideos,
  crawlStats,
  crawlAll,
  syncChannelsToNotion,
} from "@/lib/api";
import { Channel } from "@/lib/types";
import ChannelTable from "@/components/ChannelTable";
import AddChannelModal from "@/components/AddChannelModal";
import TaskProgress, { useTaskStatus } from "@/components/TaskProgress";
import { useToast } from "@/components/Toast";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { isActive } = useTaskStatus();
  const { showToast } = useToast();

  const fetchChannels = useCallback(async () => {
    try {
      const data = await getChannels();
      setChannels(data);
    } catch {
      // silent fail for polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Auto-refresh when tasks are active
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(fetchChannels, 2000);
    return () => clearInterval(interval);
  }, [isActive, fetchChannels]);

  const handleCreate = async (data: {
    url: string;
    type_of_video?: string;
  }) => {
    setCreating(true);
    try {
      await createChannel(data);
      showToast("success", "頻道新增成功");
      setModalOpen(false);
      fetchChannels();
    } catch (e: unknown) {
      showToast("error", `新增失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCrawlVideos = async (id: number) => {
    try {
      await crawlVideos(id);
      showToast("success", "已開始爬取影片");
      fetchChannels();
    } catch (e: unknown) {
      showToast("error", `爬取失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  const handleCrawlStats = async (id: number) => {
    try {
      await crawlStats(id);
      showToast("success", "已開始爬取數據");
      fetchChannels();
    } catch (e: unknown) {
      showToast("error", `爬取失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  const handleSyncNotion = async (_id: number) => {
    try {
      await syncChannelsToNotion();
      showToast("success", "已開始同步到 Notion");
    } catch (e: unknown) {
      showToast("error", `同步失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteChannel(id);
      showToast("success", "頻道已刪除");
      fetchChannels();
    } catch (e: unknown) {
      showToast("error", `刪除失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  const handleCrawlAll = async () => {
    try {
      await crawlAll();
      showToast("success", "已開始全部爬蟲");
    } catch (e: unknown) {
      showToast("error", `操作失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">頻道管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCrawlAll}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            一鍵全部爬蟲
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            新增頻道
          </button>
        </div>
      </div>

      <TaskProgress />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <ChannelTable
          channels={channels}
          loading={loading}
          onCrawlVideos={handleCrawlVideos}
          onCrawlStats={handleCrawlStats}
          onSyncNotion={handleSyncNotion}
          onDelete={handleDelete}
        />
      </div>

      <AddChannelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        loading={creating}
      />
    </div>
  );
}
