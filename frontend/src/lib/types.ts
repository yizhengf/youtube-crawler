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
  openai_api_key: string;
  deepseek_api_key: string;
  fal_api_key: string;
  sora_api_key: string;
  hailuo_api_key: string;
  grok_api_key: string;
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

export interface JobScriptSegment {
  id: number;
  segment_index: number;
  text: string;
  image_prompt: string | null;
  video_prompt: string | null;
  duration_hint_seconds: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface JobScript {
  id: number;
  job_id: number;
  script_type: string;
  content: string;
  version: number;
  created_at: string | null;
  updated_at: string | null;
  segments: JobScriptSegment[];
}

export interface Asset {
  id: number;
  job_id: number;
  asset_type: string;
  provider: string | null;
  source_url: string | null;
  local_path: string | null;
  mime_type: string | null;
  status: string;
  metadata_json: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GenerationTask {
  id: number;
  job_id: number;
  task_type: string;
  provider: string | null;
  external_task_id: string | null;
  status: string;
  request_payload: string | null;
  response_payload: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Job {
  id: number;
  job_type: "story_rewrite" | "ai_video_generation";
  title: string;
  source_video_id: number | null;
  input_mode: string | null;
  topic: string | null;
  description: string | null;
  prompt: string | null;
  provider: string | null;
  aspect_ratio: string | null;
  image_urls: string | null;
  language: string | null;
  tone: string | null;
  target_duration: number | null;
  status: string;
  review_status: string;
  current_step: string | null;
  error_message: string | null;
  result_summary: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface JobDetail extends Job {
  scripts: JobScript[];
  assets: Asset[];
  generation_tasks: GenerationTask[];
  source_video: Video | null;
}

export interface JobCreateInput {
  job_type: "story_rewrite" | "ai_video_generation";
  title: string;
  source_video_id?: number | null;
  input_mode?: string | null;
  topic?: string | null;
  description?: string | null;
  prompt?: string | null;
  provider?: string | null;
  aspect_ratio?: string | null;
  image_urls?: string[];
  language?: string | null;
  tone?: string | null;
  target_duration?: number | null;
  review_required?: boolean;
}

export interface AnalysisStatus {
  status: string;
  message: string;
}
