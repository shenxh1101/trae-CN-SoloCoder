import type {
  CreateRoomRequest,
  CreateRoomResponse,
  VerifyRequest,
  VerifyResponse,
  Room,
  Option,
  Danmu,
  VoteRecord,
} from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP Error: ${response.status}`,
      }
    }

    return data as ApiResponse<T>
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

export function createRoom(
  data: CreateRoomRequest,
  fingerprint: string
): Promise<ApiResponse<CreateRoomResponse>> {
  return request<CreateRoomResponse>('/api/rooms', {
    method: 'POST',
    headers: {
      'x-fingerprint': fingerprint,
    },
    body: JSON.stringify(data),
  })
}

export function getRoom(
  id: string
): Promise<ApiResponse<Omit<Room, 'voteRecords'> & {
  voteRecords: Array<Omit<VoteRecord, 'ip' | 'fingerprint'>>
}>> {
  return request(`/api/rooms/${id}`)
}

export function verifyVote(
  roomId: string,
  data: VerifyRequest
): Promise<ApiResponse<VerifyResponse>> {
  return request<VerifyResponse>(`/api/rooms/${roomId}/verify`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getResults(
  roomId: string,
  userId?: string
): Promise<ApiResponse<{
  options: Option[]
  totalVotes: number
  voteRecords?: Array<Omit<VoteRecord, 'ip' | 'fingerprint'>>
}>> {
  const headers: Record<string, string> = {}
  if (userId) {
    headers['x-user-id'] = userId
  }

  return request(`/api/rooms/${roomId}/results`, {
    headers,
  })
}

export function getDanmus(roomId: string): Promise<ApiResponse<Danmu[]>> {
  return request<Danmu[]>(`/api/rooms/${roomId}/danmus`)
}
