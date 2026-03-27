"use client";

import Link from "next/link";
import { Channel } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface ChannelTableProps {
  channels: Channel[];
  onCrawlVideos: (id: number) => void;
  onCrawlStats: (id: number) => void;
  onSyncNotion: (id: number) => void;
  onDelete: (id: number) => void;
  loading?: boolean;
}

export default function ChannelTable({
  channels,
  onCrawlVideos,
  onCrawlStats,
  onSyncNotion,
  onDelete,
  loading,
}: ChannelTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
        載入中...
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg mb-2">尚無頻道</p>
        <p className="text-sm">點擊「新增頻道」來開始</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="px-4 py-3 font-medium">頻道名稱</th>
            <th className="px-4 py-3 font-medium">頻道ID</th>
            <th className="px-4 py-3 font-medium">影片類型</th>
            <th className="px-4 py-3 font-medium">狀態</th>
            <th className="px-4 py-3 font-medium text-right">影片數</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((ch, idx) => (
            <tr
              key={ch.id}
              className={`border-b border-gray-100 hover:bg-gray-50 ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              }`}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/channels/${ch.id}/videos`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {ch.handle || ch.url}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                {ch.channel_id || "-"}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {ch.type_of_video || "-"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={ch.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {ch.video_count.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onCrawlVideos(ch.id)}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    爬取影片
                  </button>
                  <button
                    onClick={() => onCrawlStats(ch.id)}
                    className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                  >
                    爬取數據
                  </button>
                  <button
                    onClick={() => onSyncNotion(ch.id)}
                    className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                  >
                    同步Notion
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("確定要刪除此頻道嗎？")) onDelete(ch.id);
                    }}
                    className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                  >
                    刪除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
