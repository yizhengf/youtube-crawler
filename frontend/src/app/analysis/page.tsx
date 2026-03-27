"use client";

import { useEffect, useState } from "react";

import { getAnalysisStatus } from "@/lib/api";
import { AnalysisStatus } from "@/lib/types";

export default function AnalysisPage() {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);

  useEffect(() => {
    getAnalysisStatus().then(setStatus).catch(() => {
      setStatus({
        status: "planned",
        message: "AI 分析功能已預留，稍後會支援爆款拆解與對標頻道分析。",
      });
    });
  }, []);

  return (
    <div className="max-w-4xl">
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 shadow-sm">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          Coming Soon
        </span>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">AI 分析</h1>
        <p className="mt-3 text-sm leading-7 text-gray-600">
          這個模組已經在架構上預留，後續會補上爆款影片拆解、對標頻道分析、內容公式萃取與選題建議。
        </p>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
          <p className="font-medium text-gray-900">目前狀態</p>
          <p className="mt-2">{status?.message || "功能規劃中"}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            "爆款影片拆解卡",
            "對標頻道 DNA 報告",
            "可執行的內容建議清單",
          ].map((item) => (
            <div key={item} className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900">{item}</div>
              <p className="mt-2 text-xs leading-6 text-gray-500">
                已保留頁面與 API 入口，等 MVP 主流程穩定後再接真實 AI 分析能力。
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
