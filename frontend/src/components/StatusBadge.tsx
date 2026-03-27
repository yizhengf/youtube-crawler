"use client";

export type BadgeStatus = string;

const statusConfig: Record<string, { label: string; color: string }> = {
  "準備拿取頻道ID": { label: "準備拿取頻道ID", color: "bg-gray-200 text-gray-700" },
  "準備爬蟲": { label: "準備爬蟲", color: "bg-yellow-100 text-yellow-800" },
  "爬蟲完成": { label: "爬蟲完成", color: "bg-green-100 text-green-800" },
  "爬取中": { label: "爬取中", color: "bg-blue-100 text-blue-800" },
  "錯誤": { label: "錯誤", color: "bg-red-100 text-red-800" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    color: "bg-gray-200 text-gray-700",
  };

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.color}`}
    >
      {config.label}
    </span>
  );
}
