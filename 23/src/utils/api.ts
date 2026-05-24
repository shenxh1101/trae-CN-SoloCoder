import type {
  ImageClassification,
  FeedbackSubmission,
  ConfusionMatrixData,
  ApiResponse,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        ...(options.body && !(options.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function classifyImages(
  images: { blob: Blob; filename: string }[]
): Promise<ApiResponse<ImageClassification[]>> {
  const formData = new FormData();
  images.forEach((img) => {
    formData.append('images', img.blob, img.filename);
  });

  return request<ImageClassification[]>('/classify', {
    method: 'POST',
    body: formData,
  });
}

export async function classifyFromUrl(
  url: string
): Promise<ApiResponse<ImageClassification[]>> {
  return request<ImageClassification[]>('/classify/url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export async function submitFeedback(
  feedback: FeedbackSubmission
): Promise<ApiResponse<void>> {
  return request<void>('/feedback', {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
}

export async function getFeedback(): Promise<ApiResponse<FeedbackSubmission[]>> {
  return request<FeedbackSubmission[]>('/feedback', {
    method: 'GET',
  });
}

export async function getHistory(
  limit: number = 20
): Promise<ApiResponse<ImageClassification[]>> {
  return request<ImageClassification[]>(`/history?limit=${limit}`, {
    method: 'GET',
  });
}

export async function getHistoryItem(
  id: string
): Promise<ApiResponse<ImageClassification>> {
  return request<ImageClassification>(`/history/${id}`, {
    method: 'GET',
  });
}

export async function reclassifyHistoryItem(
  id: string
): Promise<ApiResponse<ImageClassification>> {
  return request<ImageClassification>(`/history/${id}/reclassify`, {
    method: 'POST',
  });
}

export async function getConfusionMatrix(): Promise<
  ApiResponse<ConfusionMatrixData>
> {
  return request<ConfusionMatrixData>('/confusion-matrix', {
    method: 'GET',
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getShortClassName(className: string): string {
  const parts = className.split(',');
  return parts[0].trim();
}
