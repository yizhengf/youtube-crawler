export interface Channel {
  id: number;
  url: string;
  handle: string | null;
  channel_id: string | null;
  type_of_video: string | null;
  status: string;
  notion_page_id: string | null;
  video_count: number;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: number;
  channel_id: string;
  video_id: string;
  title: string | null;
  url: string | null;
  thumbnail: string | null;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  tags: string | null;
  description: string | null;
  duration: string | null;
  type_of_video: string | null;
  status: string;
  notion_page_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  youtube_api_key: string;
  notion_token: string;
  notion_channels_db_id: string;
  notion_videos_db_id: string;
}

export interface TaskItem {
  task_id: string;
  type: string;
  status: string;
  progress_current: number;
  progress_total: number;
  message: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface VideoParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  channel_id?: string;
}

export interface VideoStats {
  total_videos: number;
  total_crawled: number;
  avg_view_count: number | null;
  avg_like_count: number | null;
  avg_comment_count: number | null;
}
