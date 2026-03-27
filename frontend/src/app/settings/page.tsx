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
  openai_api_key: "",
  deepseek_api_key: "",
  fal_api_key: "",
  sora_api_key: "",
  hailuo_api_key: "",
  grok_api_key: "",
};

const SETTING_FIELDS: Array<keyof Settings> = [
  "youtube_api_key",
  "notion_token",
  "notion_channels_db_id",
  "notion_videos_db_id",
  "openai_api_key",
  "deepseek_api_key",
  "fal_api_key",
  "sora_api_key",
  "hailuo_api_key",
  "grok_api_key",
];

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
    openai_api_key: false,
    deepseek_api_key: false,
    fal_api_key: false,
    sora_api_key: false,
    hailuo_api_key: false,
    grok_api_key: false,
  });
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      const normalized: Settings = {
        youtube_api_key: looksMasked(data.youtube_api_key || "") ? "" : data.youtube_api_key || "",
        notion_token: looksMasked(data.notion_token || "") ? "" : data.notion_token || "",
        notion_channels_db_id: data.notion_channels_db_id || "",
        notion_videos_db_id: data.notion_videos_db_id || "",
        openai_api_key: looksMasked(data.openai_api_key || "") ? "" : data.openai_api_key || "",
        deepseek_api_key: looksMasked(data.deepseek_api_key || "") ? "" : data.deepseek_api_key || "",
        fal_api_key: looksMasked(data.fal_api_key || "") ? "" : data.fal_api_key || "",
        sora_api_key: looksMasked(data.sora_api_key || "") ? "" : data.sora_api_key || "",
        hailuo_api_key: looksMasked(data.hailuo_api_key || "") ? "" : data.hailuo_api_key || "",
        grok_api_key: looksMasked(data.grok_api_key || "") ? "" : data.grok_api_key || "",
      };
      setForm(normalized);
      setStoredMasked({
        youtube_api_key: data.youtube_api_key || "",
        notion_token: data.notion_token || "",
        notion_channels_db_id: data.notion_channels_db_id || "",
        notion_videos_db_id: data.notion_videos_db_id || "",
        openai_api_key: data.openai_api_key || "",
        deepseek_api_key: data.deepseek_api_key || "",
        fal_api_key: data.fal_api_key || "",
        sora_api_key: data.sora_api_key || "",
        hailuo_api_key: data.hailuo_api_key || "",
        grok_api_key: data.grok_api_key || "",
      });
      setDirty(
        SETTING_FIELDS.reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {} as Record<keyof Settings, boolean>)
      );
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

      SETTING_FIELDS.forEach((field) => {
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

  const toggleFieldVisibility = (field: keyof Settings) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const renderSecretField = (
    field: keyof Settings,
    label: string,
    placeholder: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={visibleFields[field] ? "text" : "password"}
          value={form[field]}
          onChange={(e) => update(field, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={
            storedMasked[field]
              ? `${storedMasked[field]}（已保存，留空則不變）`
              : placeholder
          }
        />
        <button
          type="button"
          onClick={() => toggleFieldVisibility(field)}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
        >
          {visibleFields[field] ? "隱藏" : "顯示"}
        </button>
      </div>
    </div>
  );

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-4xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-5 rounded-xl border border-gray-200 p-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">YouTube / Notion</h2>
                <p className="mt-1 text-sm text-gray-500">
                  頻道爬蟲、影片資料庫與 Notion 同步設定。
                </p>
              </div>

              {renderSecretField("youtube_api_key", "YouTube Data API Key", "AIza...")}
              {renderSecretField("notion_token", "Notion Integration Token", "secret_...")}

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
            </div>

            <div className="space-y-5 rounded-xl border border-gray-200 p-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">AI Provider Keys</h2>
                <p className="mt-1 text-sm text-gray-500">
                  先保留任務中心需要的 provider 設定，後續接真實模型時可直接沿用。
                </p>
              </div>

              {renderSecretField("openai_api_key", "OpenAI API Key", "sk-...")}
              {renderSecretField("deepseek_api_key", "DeepSeek API Key", "sk-...")}
              {renderSecretField("fal_api_key", "fal.ai API Key", "fal_...")}
              {renderSecretField("sora_api_key", "Sora / Kie API Key", "填入影片生成金鑰")}
              {renderSecretField("hailuo_api_key", "海螺 API Key", "填入海螺生成金鑰")}
              {renderSecretField("grok_api_key", "Grok API Key", "xai-...")}
            </div>
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
