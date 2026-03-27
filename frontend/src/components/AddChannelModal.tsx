"use client";

import { useState } from "react";

interface AddChannelModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { url: string; type_of_video?: string }) => void;
  loading?: boolean;
}

export default function AddChannelModal({
  open,
  onClose,
  onSubmit,
  loading,
}: AddChannelModalProps) {
  const [url, setUrl] = useState("");
  const [videoType, setVideoType] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit({
      url: url.trim(),
      type_of_video: videoType.trim() || undefined,
    });
    setUrl("");
    setVideoType("");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold mb-4">新增頻道</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              YouTube 頻道網址
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/@handle"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              影片類型（選填）
            </label>
            <input
              type="text"
              value={videoType}
              onChange={(e) => setVideoType(e.target.value)}
              placeholder="例如：Shorts、長影片"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "新增中..." : "新增"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
