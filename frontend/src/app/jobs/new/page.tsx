"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/Toast";
import { createJob } from "@/lib/api";
import { JobCreateInput } from "@/lib/types";

const DEFAULT_FORM: JobCreateInput = {
  job_type: "story_rewrite",
  title: "",
  topic: "",
  description: "",
  prompt: "",
  provider: "sora",
  aspect_ratio: "9:16",
  image_urls: [],
  language: "繁體中文",
  tone: "懸疑、節奏快、口語化",
  target_duration: 45,
  review_required: true,
};

export default function NewJobPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [imageUrlsText, setImageUrlsText] = useState("");
  const [form, setForm] = useState<JobCreateInput>(DEFAULT_FORM);

  const setField = <K extends keyof JobCreateInput>(key: K, value: JobCreateInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: JobCreateInput = {
        ...form,
        image_urls: imageUrlsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      };
      const job = await createJob(payload);
      showToast("success", "任務建立成功");
      router.push(`/jobs/${job.id}`);
    } catch (e: unknown) {
      showToast("error", `建立任務失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isStory = form.job_type === "story_rewrite";

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">建立任務</h1>
        <p className="mt-1 text-sm text-gray-500">
          先收斂支援兩種任務：仿寫故事影片、AI 影片生成。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">任務類型</label>
            <select
              value={form.job_type}
              onChange={(e) => setField("job_type", e.target.value as JobCreateInput["job_type"])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="story_rewrite">仿寫故事影片</option>
              <option value="ai_video_generation">AI 影片生成</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">任務標題</label>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isStory ? "例如：都市怪談仿寫任務" : "例如：AI 霓虹城市生成任務"}
              required
            />
          </div>
        </div>

        {isStory ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">故事主題</label>
              <input
                value={form.topic || ""}
                onChange={(e) => setField("topic", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：失蹤者深夜來電"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">語氣風格</label>
              <input
                value={form.tone || ""}
                onChange={(e) => setField("tone", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="懸疑、節奏快、口語化"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">故事描述</label>
              <textarea
                value={form.description || ""}
                onChange={(e) => setField("description", e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="補充角色、衝突、世界觀與想要的情緒。"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">影片生成 Provider</label>
              <select
                value={form.provider || "sora"}
                onChange={(e) => setField("provider", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sora">Sora / Kie</option>
                <option value="hailuo">海螺</option>
                <option value="grok">Grok</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">畫面比例</label>
              <select
                value={form.aspect_ratio || "9:16"}
                onChange={(e) => setField("aspect_ratio", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="9:16">9:16 直式</option>
                <option value="16:9">16:9 橫式</option>
                <option value="1:1">1:1 方形</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Prompt / 生成描述</label>
              <textarea
                value={form.prompt || ""}
                onChange={(e) => setField("prompt", e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="描述主題、畫面風格、鏡頭語言與氛圍。"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">參考圖片 URL（每行一個，可留空）</label>
              <textarea
                value={imageUrlsText}
                onChange={(e) => setImageUrlsText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/ref-1.jpg"
              />
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">語言</label>
            <input
              value={form.language || ""}
              onChange={(e) => setField("language", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">目標秒數</label>
            <input
              type="number"
              min={5}
              value={form.target_duration || 45}
              onChange={(e) => setField("target_duration", Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(form.review_required)}
              onChange={(e) => setField("review_required", e.target.checked)}
            />
            執行後需要人工審核
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "建立中..." : "建立任務"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
