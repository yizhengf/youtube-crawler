import {
  Channel,
  Video,
  Settings,
  TaskItem,
  PaginatedResponse,
  VideoParams,
  VideoStats,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Settings
export async function getSettings(): Promise<Settings> {
  return request<Settings>("/api/settings");
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  return request<Settings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Channels
export async function getChannels(): Promise<Channel[]> {
  return request<Channel[]>("/api/channels");
}

export async function createChannel(data: {
  url: string;
  type_of_video?: string;
}): Promise<Channel> {
  return request<Channel>("/api/channels", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateChannel(
  id: number,
  data: { type_of_video?: string }
): Promise<Channel> {
  return request<Channel>(`/api/channels/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteChannel(id: number): Promise<void> {
  await request<void>(`/api/channels/${id}`, { method: "DELETE" });
}

// Channel actions
export async function resolveChannel(id: number): Promise<{ task_id: string; message: string }> {
  return request(`/api/channels/${id}/resolve`, { method: "POST" });
}

export async function crawlVideos(id: number): Promise<{ task_id: string; message: string }> {
  return request(`/api/channels/${id}/crawl-videos`, { method: "POST" });
}

export async function crawlStats(id: number): Promise<{ task_id: string; message: string }> {
  return request(`/api/channels/${id}/crawl-stats`, { method: "POST" });
}

export async function crawlAll(): Promise<{ task_id: string; message: string }> {
  return request("/api/crawl/all", { method: "POST" });
}

// Tasks
export async function getTaskStatus(): Promise<TaskItem[]> {
  return request<TaskItem[]>("/api/tasks/status");
}

// Videos
export async function getVideos(
  params?: VideoParams
): Promise<PaginatedResponse<Video>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size) searchParams.set("page_size", String(params.page_size));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sort_by) searchParams.set("sort", params.sort_by);
  if (params?.sort_order) searchParams.set("order", params.sort_order);
  if (params?.channel_id) searchParams.set("channel_id", params.channel_id);
  const qs = searchParams.toString();
  return request<PaginatedResponse<Video>>(`/api/videos${qs ? `?${qs}` : ""}`);
}

export async function getVideoStats(): Promise<VideoStats> {
  return request<VideoStats>("/api/videos/stats");
}

// Notion sync
export async function syncChannelsToNotion(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/notion/sync-channels", {
    method: "POST",
  });
}

export async function syncVideosToNotion(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/notion/sync-videos", {
    method: "POST",
  });
}
