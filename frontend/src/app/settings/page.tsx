"use client";

import { useEffect, useState, useCallback } from "react";
import { getSettings, updateSettings } from "@/lib/api";
import { Settings } from "@/lib/types";
import { useToast } from "@/components/Toast";

const EMPTY_SETTINGS: Settings = {
  youtube_api_key: "",
  notion_token: "",
  notion_channels_db_id: "",
  notion_videos_db_id: "",
};

function looksMasked(value: string) {
  return value.includes("*");
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Settings>(EMPTY_SETTINGS);
  const [storedMasked, setStoredMasked] = useState<Settings>(EMPTY_SETTINGS);
  const [dirty, setDirty] = useState<Record<keyof Settings, boolean>>({
    youtube_api_key: false,
    notion_token: false,
    notion_channels_db_id: false,
    notion_videos_db_id: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showNotionToken, setShowNotionToken] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      const normalized: Settings = {
        youtube_api_key: looksMasked(data.youtube_api_key || "") ? "" : data.youtube_api_key || "",
        notion_token: looksMasked(data.notion_token || "") ? "" : data.notion_token || "",
        notion_channels_db_id: data.notion_channels_db_id || "",
        notion_videos_db_id: data.notion_videos_db_id || "",
      };
      setForm(normalized);
      setStoredMasked({
        youtube_api_key: data.youtube_api_key || "",
        notion_token: data.notion_token || "",
        notion_channels_db_id: data.notion_channels_db_id || "",
        notion_videos_db_id: data.notion_videos_db_id || "",
      });
      setDirty({
        youtube_api_key: false,
        notion_token: false,
        notion_channels_db_id: false,
        notion_videos_db_id: false,
      });
    } catch {
      // may not exist yet, keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Settings> = {};

      (Object.keys(form) as Array<keyof Settings>).forEach((field) => {
        if (!dirty[field]) {
          return;
        }

        const value = form[field]?.trim();
        if (value) {
          payload[field] = value;
        }
      });

      await updateSettings(payload);
      await fetchSettings();
      showToast("success", "設定已儲存");
    } catch (e: unknown) {
      showToast("error", `儲存失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof Settings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty((prev) => ({ ...prev, [field]: true }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
        載入中...
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">設定</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* YouTube API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              YouTube Data API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={form.youtube_api_key}
                onChange={(e) => update("youtube_api_key", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  storedMasked.youtube_api_key
                    ? `${storedMasked.youtube_api_key}（已保存，留空則不變）`
                    : "AIza..."
                }
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? "隱藏" : "顯示"}
              </button>
            </div>
          </div>

          {/* Notion Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notion Integration Token
            </label>
            <div className="relative">
              <input
                type={showNotionToken ? "text" : "password"}
                value={form.notion_token}
                onChange={(e) => update("notion_token", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  storedMasked.notion_token
                    ? `${storedMasked.notion_token}（已保存，留空則不變）`
                    : "secret_..."
                }
              />
              <button
                type="button"
                onClick={() => setShowNotionToken(!showNotionToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {showNotionToken ? "隱藏" : "顯示"}
              </button>
            </div>
          </div>

          {/* Notion Channel DB ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notion 頻道庫 Database ID
            </label>
            <input
              type="text"
              value={form.notion_channels_db_id}
              onChange={(e) => update("notion_channels_db_id", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          {/* Notion Video DB ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notion 影片庫 Database ID
            </label>
            <input
              type="text"
              value={form.notion_videos_db_id}
              onChange={(e) => update("notion_videos_db_id", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "儲存中..." : "儲存設定"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
