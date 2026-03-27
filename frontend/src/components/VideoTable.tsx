"use client";

import { Video } from "@/lib/types";

interface VideoTableProps {
  videos: Video[];
  loading?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  showChannel?: boolean;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "-";
  return n.toLocaleString();
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  return d.slice(0, 10);
}

const sortableColumns = [
  { key: "title", label: "標題", align: "left" as const },
  { key: "view_count", label: "觀看數", align: "right" as const },
  { key: "like_count", label: "按讚數", align: "right" as const },
  { key: "comment_count", label: "評論數", align: "right" as const },
  { key: "published_at", label: "發佈時間", align: "left" as const },
];

export default function VideoTable({
  videos,
  loading,
  sortBy,
  sortOrder,
  onSort,
  showChannel,
}: VideoTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
        載入中...
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg mb-2">尚無影片</p>
        <p className="text-sm">請先爬取頻道影片</p>
      </div>
    );
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">&#8597;</span>;
    return (
      <span className="ml-1 text-blue-600">
        {sortOrder === "asc" ? "\u25B2" : "\u25BC"}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="px-4 py-3 font-medium w-[120px]">縮圖</th>
            {showChannel && (
              <th className="px-4 py-3 font-medium">頻道</th>
            )}
            {sortableColumns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-medium cursor-pointer hover:text-gray-800 select-none ${
                  col.align === "right" ? "text-right" : ""
                }`}
                onClick={() => onSort(col.key)}
              >
                {col.label}
                <SortIcon field={col.key} />
              </th>
            ))}
            <th className="px-4 py-3 font-medium">狀態</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((v, idx) => (
            <tr
              key={v.id}
              className={`border-b border-gray-100 hover:bg-gray-50 ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              }`}
            >
              <td className="px-4 py-2">
                {v.thumbnail ? (
                  <img
                    src={v.thumbnail}
                    alt={v.title ?? undefined}
                    width={120}
                    height={68}
                    className="rounded object-cover"
                    style={{ width: 120, height: 68 }}
                  />
                ) : (
                  <div className="w-[120px] h-[68px] bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                    無縮圖
                  </div>
                )}
              </td>
              {showChannel && (
                <td className="px-4 py-2 text-gray-600">
                  {v.channel_id || "-"}
                </td>
              )}
              <td className="px-4 py-2">
                <a
                  href={v.url || `https://www.youtube.com/watch?v=${v.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline line-clamp-2"
                  title={v.title ?? undefined}
                >
                  {v.title}
                </a>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {formatNumber(v.view_count)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {formatNumber(v.like_count)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {formatNumber(v.comment_count)}
              </td>
              <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                {formatDate(v.published_at)}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    v.status === "完成"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {v.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
