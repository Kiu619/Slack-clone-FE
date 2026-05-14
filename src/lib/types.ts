/**
 * Types frontend — đồng bộ với `slack-clone/src/database/schema.ts` (NestJS).
 * - `*Row`: bản ghi bảng (camelCase như JSON; timestamp = ISO string).
 * - Các type còn lại: DTO API (join, aggregate), có thể là subset hoặc thêm field tính toán.
 */

/** Chuỗi ISO 8601 — Nest serialize `Date` ra JSON */
export type IsoDateString = string

export type WorkspaceMemberRole = "owner" | "admin" | "member"

// ─── Direct Messages ────────────────────────────────────────────────────────

export type DirectMessageConversation = {
  id: string
  workspaceId: string
  isGroup: boolean
  lastMessageAt: IsoDateString | null
  lastMessageContent: string | null
  lastMessageUserId: string | null
  lastMessageId: string | null
  lastMessageUser: {
    id: string
    name: string | null
    displayName: string | null
  } | null
  topic: string | null
  description: string | null
  createdAt: IsoDateString
  updatedAt: IsoDateString
  members: User[]
  /** Star cá nhân (membership); từ API list/detail */
  starredAt?: IsoDateString | null
}

export type CreateDirectMessagePayload = {
  userIds: string[]
}

/** PATCH /workspaces/:wid/direct-messages/:conversationId */
export type UpdateConversationPayload = {
  topic?: string | null
  description?: string | null
}

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
  email: string | null
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

// ─── Schema: `saved_items` ───────────────────────────────────────────────────

export type SavedItemStatus = 'in_progress' | 'completed' | 'archived'

export type SavedItem = {
  id: string
  type: 'message' | 'attachment' | 'reminder'
  status: SavedItemStatus
  note: string | null
  remindAt: IsoDateString | null
  completedAt: IsoDateString | null
  createdAt: IsoDateString
  // Dữ liệu Message (nếu type === 'message')
  message?: Message | null
  // Dữ liệu Attachment (nếu type === 'attachment')
  attachment?: MessageAttachment | null
  // Dữ liệu User (nếu type === 'reminder')
  user?: {
    id: string
    name: string
    displayName: string
    avatar: string | null
  } | null
}

export type SavedItemsPage = {
  items: SavedItem[]
  nextCursor: string | null
}

export type SaveItemPayload = {
  type: 'message' | 'attachment' | 'reminder'
  messageId?: string | null
  attachmentId?: string | null
  note?: string | null
  remindAt?: IsoDateString | null
}

export type UpdateSavedItemPayload = {
  status?: SavedItemStatus
  note?: string | null
  remindAt?: string | null // ISO string or null to clear
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
  /** Kênh mặc định workspace (không đổi tên qua API user thường) */
  isDefaultChannel: boolean
  topic: string | null
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

export type MessageType = "text" | "system" | "timeline"

export type MessagesRow = {
  id: string
  channelId: string | null
  conversationId: string | null
  userId: string
  content: string
  type: MessageType
  parentId: string | null
  alsoSendToChannel: boolean
  editedAt: IsoDateString | null
  deletedAt: IsoDateString | null
  replyCount: number
  replyParticipantIds: string[]
  lastReplyAt: IsoDateString | null
  isPinned: boolean
  /** false = tin server (topic/…), không cho PATCH — thiếu field coi như true */
  allowEdit?: boolean
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

export type AttachmentsUser = {
  id: string
  displayName: string
  name: string
  avatar: string
}

export type AttachmentsRow = {
  id: string
  messageId: string
  workspaceId: string
  userId: string
  channelId: string | null
  conversationId: string | null
  fileCategory: string
  url: string
  /** 'image' | 'video' | 'audio' | 'file' */
  type: string
  name: string
  size: number
  mimeType: string | null
  width: number | null
  height: number | null
  duration: number | null
  /** `message_body` = user file; `forward_quote` = copy from forwarded source (Nest). */
  originScope?: 'message_body' | 'forward_quote'
  createdAt: IsoDateString
  updatedAt: IsoDateString


  user: AttachmentsUser
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

export type Channel = ChannelsRow & {
  /** Star cá nhân (membership); từ API list/detail */
  starredAt?: IsoDateString | null
}

export type ChannelMember = {
  id: string
  name: string | null
  displayName?: string | null
  email: string
  avatar: string | null
  joinedAt: string
  isAway: boolean
  statusEmoji?: string | null
  statusText?: string | null
}

/** GET .../direct-messages/:id/invite-candidates */
export type DmInviteCandidate = ChannelMember & {
  inConversation: boolean
}

/** GET .../channels/:id/members — tab Members (in channel / not in channel). */
export type ChannelMembersDirectory = {
  inChannel: ChannelMember[]
  notInChannel: ChannelMember[]
}

export type CreateChannelPayload = {
  name: string
  type?: ChannelType
  isPrivate?: boolean
  description?: string
}

/** PATCH /workspaces/:wid/channels/:cid */
export type UpdateChannelPayload = {
  name?: string
  topic?: string | null
  description?: string | null
}

// ─── Message & Chat (DTO; nested `user` là aggregate, không phải `UsersRow`) ─

export type Reaction = {
  emoji: string
  count: number
  /** userId của những người đã react — để biết current user đã react chưa */
  userIds: string[]
}

export type MessageAttachment = AttachmentsRow & {
  channelName?: string | null
  conversationName?: string | null

  // for later module
  parentId: string | null // đây là parentId của message chứa attachment này (tức là nếu attachment ở trong thread)
  parentMessage: Message | null
}

export type MessageForwardSnapshot = {
  sourceMessageId: string
  sourceUser: User
  sourceContent: string
  sourceEditedAt: IsoDateString | null
}

export type Message = Omit<MessagesRow, "userId"> & {
  /** Snapshot tin gốc khi message là forward (từ API) */
  forwardSnapshot?: MessageForwardSnapshot | Record<string, unknown> | null
  /** Có trên payload API / realtime khi gửi kèm workspace */
  workspaceId?: string
  /** Thông tin user gửi tin — join `users` + `workspace_members` */
  user: User
  reactions: Reaction[]
  attachments: MessageAttachment[]
  parent?: {
    content: string
    deletedAt: IsoDateString | null
    attachments: MessageAttachment[]
  }
  channelName?: string
  parentMessage?: Message
}

/**
 * Response từ GET /channels/:channelId/messages
 * Cursor-based pagination: lấy messages cũ hơn cursor (load ngược lên trên)
 */
export type MessagesPage = {
  messages: Message[]
  /** null = đã hết messages (đầu lịch sử) */
  nextCursor: string | null
  prevCursor?: string | null
  hasMore: boolean
}

/** Một dòng trong GET /channels/:id/attachments hoặc files/search */
export type ChannelFileHit = {
  attachment: MessageAttachment
  message: Message
}

/** Response GET /channels/:channelId/attachments (infinite query tab Files) */
export type ChannelAttachmentsPage = {
  results: ChannelFileHit[]
  nextCursor: string | null
  hasMore: boolean
}

/** Folder trong channel hoặc DM (API folders) */
export type ChannelFolder = {
  id: string
  channelId: string | null
  conversationId: string | null
  name: string
  createdAt: string
  updatedAt: string
}

export type UploadFileToFolderDto = {
  url: string
  type: string
  name: string
  size: number
  mimeType?: string | null
  width?: number | null
  height?: number | null
  duration?: number | null
}

export type SendMessagePayload = {
  content: string
  parentId?: string
  alsoSendToChannel?: boolean
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

export type PendingFile = {
  id: string
  file: File
}

export type NotificationType = "mention" | "reply" | "dm" | "reaction" | "channel_invite"

export type Notification = {
  id: string
  userId: string
  workspaceId: string
  type: NotificationType
  messageId: string | null
  channelId: string | null
  conversationId: string | null
  actorId: string | null
  isRead: boolean
  readAt: IsoDateString | null
  createdAt: IsoDateString
  // Joined data
  actor?: {
    id: string
    name: string | null
    avatar: string | null
  }
  channel?: {
    id: string
    name: string
  }
  message?: {
    id: string
    content: string
    createdAt: IsoDateString
  }
}

export type NotificationsPage = {
  items: Notification[]
  nextCursor: string | null
  hasMore: boolean
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export type ThreadSubscription = {
  id: string
  userId: string
  parentMessageId: string
  workspaceId: string
  lastReadAt: IsoDateString
  isMuted: boolean
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export type ThreadMessage = Message & {
  lastReadAt: IsoDateString
  isUnread: boolean
  channel: {
    id: string
    name: string
    type: ChannelType
    isPrivate: boolean
  } | null
  conversation: {
    id: string
    isGroup: boolean
    members: User[]
  } | null
  replies: Message[]
  hasMoreReplies: boolean
}

export type ThreadsPage = {
  threads: ThreadMessage[]
  nextCursor: string | null
  hasMore: boolean
}
