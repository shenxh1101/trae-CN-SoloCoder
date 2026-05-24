import { ref, onUnmounted } from 'vue'
import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types'

type SocketInstance = Socket<ServerToClientEvents, ClientToServerEvents>

export function useSocket() {
  const socket = ref<SocketInstance | null>(null)
  const isConnected = ref(false)

  function connect() {
    if (socket.value && isConnected.value) {
      return socket.value
    }

    socket.value = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.value.on('connect', () => {
      isConnected.value = true
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
    })

    socket.value.on('connect_error', () => {
      isConnected.value = false
    })

    return socket.value
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }

  function joinRoom(roomId: string, userId: string, userName: string, fingerprint: string) {
    if (!socket.value) {
      connect()
    }
    socket.value?.emit('join-room', { roomId, userId, userName, fingerprint })
  }

  function leaveRoom(roomId: string, userId: string) {
    socket.value?.emit('leave-room', { roomId, userId })
  }

  function sendVote(roomId: string, optionIds: string[], userId: string, userName: string, fingerprint: string) {
    socket.value?.emit('vote', { roomId, optionIds, userId, userName, fingerprint })
  }

  function sendDanmu(roomId: string, userId: string, userName: string, content: string) {
    socket.value?.emit('danmu', { roomId, userId, userName, content })
  }

  function controlVote(roomId: string, userId: string, action: 'start' | 'pause' | 'resume' | 'end') {
    socket.value?.emit('control-vote', { roomId, userId, action })
  }

  function onUserJoined(callback: ServerToClientEvents['user-joined']) {
    socket.value?.on('user-joined', callback)
    return () => socket.value?.off('user-joined', callback)
  }

  function onUserLeft(callback: ServerToClientEvents['user-left']) {
    socket.value?.on('user-left', callback)
    return () => socket.value?.off('user-left', callback)
  }

  function onVoteUpdated(callback: ServerToClientEvents['vote-updated']) {
    socket.value?.on('vote-updated', callback)
    return () => socket.value?.off('vote-updated', callback)
  }

  function onDanmuReceived(callback: ServerToClientEvents['danmu-received']) {
    socket.value?.on('danmu-received', callback)
    return () => socket.value?.off('danmu-received', callback)
  }

  function onVoteStatusChanged(callback: ServerToClientEvents['vote-status-changed']) {
    socket.value?.on('vote-status-changed', callback)
    return () => socket.value?.off('vote-status-changed', callback)
  }

  function onVoteEnded(callback: ServerToClientEvents['vote-ended']) {
    socket.value?.on('vote-ended', callback)
    return () => socket.value?.off('vote-ended', callback)
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendVote,
    sendDanmu,
    controlVote,
    onUserJoined,
    onUserLeft,
    onVoteUpdated,
    onDanmuReceived,
    onVoteStatusChanged,
    onVoteEnded,
  }
}
