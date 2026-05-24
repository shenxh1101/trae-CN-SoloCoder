import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Room, User, Option, Danmu, VoteRecord } from '../../shared/types'

export const useRoomStore = defineStore('room', () => {
  const room = ref<Room | null>(null)
  const currentUser = ref<User | null>(null)
  const hasVoted = ref(false)
  const onlineCount = ref(0)

  const isHost = computed(() => {
    return currentUser.value?.role === 'host'
  })

  const isVoting = computed(() => {
    return room.value?.status === 'voting'
  })

  const isEnded = computed(() => {
    return room.value?.status === 'ended'
  })

  const totalVotes = computed(() => {
    if (!room.value) return 0
    return room.value.options.reduce((sum, opt) => sum + opt.votes, 0)
  })

  function setRoom(roomData: Room) {
    room.value = roomData
    onlineCount.value = roomData.onlineUsers.length
  }

  function updateOptions(options: Option[]) {
    if (room.value) {
      room.value.options = options
    }
  }

  function addDanmu(danmu: Danmu) {
    if (room.value) {
      room.value.danmus.push(danmu)
    }
  }

  function setUserInfo(user: User) {
    currentUser.value = user
    hasVoted.value = user.hasVoted
  }

  function setHasVoted(voted: boolean) {
    hasVoted.value = voted
    if (currentUser.value) {
      currentUser.value.hasVoted = voted
    }
  }

  function updateStatus(status: Room['status'], endTime?: number) {
    if (room.value) {
      room.value.status = status
      if (endTime) {
        room.value.endTime = endTime
      }
    }
  }

  function updateOnlineCount(count: number) {
    onlineCount.value = count
  }

  function addUser(user: User) {
    if (room.value) {
      const existingIndex = room.value.onlineUsers.findIndex(u => u.id === user.id)
      if (existingIndex >= 0) {
        room.value.onlineUsers[existingIndex] = user
      } else {
        room.value.onlineUsers.push(user)
      }
    }
  }

  function removeUser(userId: string) {
    if (room.value) {
      room.value.onlineUsers = room.value.onlineUsers.filter(u => u.id !== userId)
    }
  }

  function addVoteRecord(record: Omit<VoteRecord, 'ip' | 'fingerprint'>) {
    if (room.value) {
      room.value.voteRecords.push(record as VoteRecord)
    }
  }

  function reset() {
    room.value = null
    currentUser.value = null
    hasVoted.value = false
    onlineCount.value = 0
  }

  return {
    room,
    currentUser,
    hasVoted,
    onlineCount,
    isHost,
    isVoting,
    isEnded,
    totalVotes,
    setRoom,
    updateOptions,
    addDanmu,
    setUserInfo,
    setHasVoted,
    updateStatus,
    updateOnlineCount,
    addUser,
    removeUser,
    addVoteRecord,
    reset,
  }
})
