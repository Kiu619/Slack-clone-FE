/**
 * Types frontend — đồng bộ với `slack-clone/src/database/schema.ts` (NestJS).
 * - `*Row`: bản ghi bảng (camelCase như JSON; timestamp = ISO string).
 * - Các type còn lại: DTO API (join, aggregate), có thể là subset hoặc thêm field tính toán.
 */

/** Chuỗi ISO 8601 — Nest serialize `Date` ra JSON */
export type IsoDateString = string

export type WorkspaceMemberRole = "owner" | "admin" | "member"

// ─── Schema: `users` ─────────────────────────────────────────────────────────

export type UsersRow = {
  id: string
  email: string
  name: string | null
  avatar: string | null
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

/** `GET /auth/me` — chỉ subset tài khoản (không trả createdAt/updatedAt) */
export type AccountUser = Pick<UsersRow, "id" | "email" | "name" | "avatar">

// ─── Schema: `workspaces` ────────────────────────────────────────────────────

export type WorkspacesRow = {
  id: string
  name: string
  slug: string
  inviteCode: string
  imageUrl: string
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

// ─── Schema: `workspace_members` ─────────────────────────────────────────────

export type WorkspaceMembersRow = {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceMemberRole
  joinedAt: IsoDateString
  name: string | null
  displayName: string | null
  avatar: string | null
  isAway: boolean
  status: string | null
  namePronunciation: string | null
  phone: string | null
  description: string | null
  timeZone: string | null
  statusText: string | null
  statusEmoji: string | null
  statusExpiration: IsoDateString | null
  notificationsPausedUntil: IsoDateString | null,
  theme: string | null
}

// ─── Schema: `channels` / `channel_members` ────────────────────────────────────

export type ChannelType = "text" | "audio" | "video"

export type ChannelsRow = {
  id: string
  workspaceId: string
  name: string
  slug: string
  type: ChannelType
  isPrivate: boolean
  description: string | null
  createdById: string | null
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export type ChannelMembersRow = {
  id: string
  channelId: string
  userId: string
  joinedAt: IsoDateString
}

// ─── Schema: `messages` / `reactions` / `attachments` ─────────────────────────

export type MessageType = "text" | "system"

export type MessagesRow = {
  id: string
  channelId: string
  userId: string
  content: string
  type: MessageType
  parentId: string | null
  editedAt: IsoDateString | null
  deletedAt: IsoDateString | null
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export type ReactionsRow = {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: IsoDateString
}

export type AttachmentsRow = {
  id: string
  messageId: string
  url: string
  /** 'image' | 'video' | 'audio' | 'file' */
  type: string
  name: string
  size: number
  mimeType: string | null
  width: number | null
  height: number | null
  duration: number | null
  createdAt: IsoDateString
}

// ─── API DTO: user hiển thị (join `users` + `workspace_members`, không phải `UsersRow`) ─

/**
 * Profile / author trong workspace — messages, sidebar, `GET /user-profile/me?workspaceId=`
 * Khớp object `user` trong message API (join workspace_members theo channel workspace).
 */
export type User = {
  id: string
  email: string
  name?: string | null
  displayName?: string | null
  avatar?: string | null
  isAway?: boolean
  status?: string | null
  namePronunciation?: string | null
  phone?: string | null
  description?: string | null
  timeZone?: string | null
  workspaceId?: string
  theme?: string | null
  statusText?: string | null
  statusEmoji?: string | null
  statusExpiration?: IsoDateString | null
  notificationsPausedUntil?: IsoDateString | null
}

/**
 * Workspace + membership: `workspaces` row + `role` / `memberCount` / status từ `workspace_members`
 * (không phải chỉ `WorkspacesRow`).
 */
export type Workspace = WorkspacesRow & {
  role: WorkspaceMemberRole
  memberCount: number
}

/** `GET /workspaces/:id/members` — join users + workspace_members (subset hiển thị danh sách) */
export type WorkspaceMember = {
  id: string
  name: string | null
  email: string
  avatar: string | null
  role: WorkspaceMemberRole
  joinedAt: string
  displayName?: string | null
  statusText: string | null
  statusEmoji: string | null
  statusExpiration: string | null
  notificationsPausedUntil: string | null
}

export type CreateWorkspacePayload = {
  name: string
  slug: string
  inviteCode: string
  imageUrl?: string
  memberEmails?: string[]
}

export type Channel = ChannelsRow

export type ChannelMember = {
  id: string
  name: string | null
  displayName?: string | null
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

// ─── Message & Chat (DTO; nested `user` là aggregate, không phải `UsersRow`) ─

export type Reaction = {
  emoji: string
  count: number
  /** userId của những người đã react — để biết current user đã react chưa */
  userIds: string[]
}

export type MessageAttachment = AttachmentsRow

export type Message = Omit<MessagesRow, "userId"> & {
  /** Thông tin user gửi tin — join `users` + `workspace_members` */
  user: User
  reactions: Reaction[]
  attachments: MessageAttachment[]
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

/** `GET .../members/:userId/status` — join giống `WorkspaceMembersRow` + users */
export type WorkspaceMemberStatus = {
  id: string
  name: string | null
  displayName?: string | null
  email: string
  avatar: string | null
  isAway: boolean
  status?: string | null
  namePronunciation: string | null
  phone: string | null
  description: string | null
  timeZone: string | null
  statusText: string | null
  statusEmoji: string | null
  statusExpiration: string | null
  notificationsPausedUntil: string | null
}
