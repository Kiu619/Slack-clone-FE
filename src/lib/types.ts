export type User = {
  userId: string
  email: string
  name?: string | null
  avatar?: string | null
  isAway: boolean
}

export type Workspace = {
  id: string
  name: string
  slug: string
  inviteCode: string
  imageUrl: string
  createdAt: string
  updatedAt: string
  role: 'owner' | 'admin' | 'member'
  memberCount: number
}

export type WorkspaceMember = {
  id: string
  name: string | null
  email: string
  avatar: string | null
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export type CreateWorkspacePayload = {
  name: string
  slug: string
  inviteCode: string
  imageUrl?: string
  memberEmails?: string[]
}

export type ChannelType = 'text' | 'audio' | 'video'

export type Channel = {
  id: string
  workspaceId: string
  name: string
  slug: string
  type: ChannelType
  isPrivate: boolean
  description: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export type ChannelMember = {
  id: string
  name: string | null
  email: string
  avatar: string | null
  joinedAt: string
}

export type CreateChannelPayload = {
  name: string
  type?: ChannelType
  isPrivate?: boolean
  description?: string
}

// ─── Message & Chat types ─────────────────────────────────────────────────────

export type MessageType = 'text' | 'system'

export type Reaction = {
  emoji: string
  count: number
  /** userId của những người đã react — để biết current user đã react chưa */
  userIds: string[]
}

export type MessageAttachment = {
  id: string
  messageId: string
  url: string
  /** 'image' | 'video' | 'audio' | 'file' */
  type: string
  name: string
  size: number
  mimeType?: string | null
  width?: number | null
  height?: number | null
  duration?: number | null
  createdAt: string
}

export type Message = {
  id: string
  channelId: string
  /** Thông tin user gửi tin — backend join từ users table */
  user: {
    id: string
    name: string | null
    avatar: string | null
    email: string
  }
  content: string
  type: MessageType
  /** parentId !== null → đây là thread reply */
  parentId: string | null
  /** editedAt !== null → message đã bị chỉnh sửa */
  editedAt: string | null
  /** deletedAt !== null → soft deleted (hiện "[Message deleted]") */
  deletedAt: string | null
  reactions: Reaction[]
  attachments: MessageAttachment[]
  createdAt: string
  updatedAt: string
}

/**
 * Response từ GET /channels/:channelId/messages
 * Cursor-based pagination: lấy messages cũ hơn cursor (load ngược lên trên)
 */
export type MessagesPage = {
  messages: Message[]
  /** null = đã hết messages (đầu lịch sử) */
  nextCursor: string | null
  hasMore: boolean
}

export type SendMessagePayload = {
  content: string
  parentId?: string
}

/** Socket.io events từ server → client */
export type SocketMessage = Message

export type TypingUser = {
  userId: string
  name: string | null
  avatar: string | null
}
