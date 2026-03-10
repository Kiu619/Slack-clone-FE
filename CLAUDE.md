# Slack Clone — Frontend (Next.js)
## Stack
- Next.js 16 App Router, ReactJS 19, TypeScript
- TanStack Query v5 — server state
- Zustand — client state (user auth)
- Axios — HTTP client
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
## Key Patterns
### Server/Client hybrid
- Server Components mặc định (không có 'use client')
- 'use client' chỉ khi cần: hooks, event handlers, browser APIs
- Layout.tsx fetch data → HydrationBoundary → Client Components đọc cache
### Data fetching
- Initial data (user, workspace, channels): Server Component + HydrationBoundary
- Dynamic data (messages): useInfiniteQuery trên client
- Realtime: WebSocket/SSE trên client
### Query Keys
- Tập trung tại src/lib/query-keys.ts (isomorphic — không có 'use client')
- Hooks re-export từ query-keys.ts
- Server fetch import từ query-keys.ts trực tiếp
### Server fetch
- src/lib/server-fetch.ts có 'server-only' guard
- Dùng native fetch (không phải axios) với cookie forwarding
- Return null thay vì throw để layout xử lý redirect
# Coding Conventions
- Prefer functional components
- Use arrow functions
- No default exports
- Use named exports
- Avoid useEffect if possible
## File structure
- src/app/         — pages, layouts (App Router)
- src/app/(app)/workspace — pages, layouts của một workspace
- src/components/  — shared UI components
- src/hooks/       — TanStack Query hooks ('use client')
- src/lib/         — utilities (types, axios, server-fetch, query-keys)
- src/modules/     — feature modules (workspace, channel...)
- src/providers/   — React providers
- src/stores/      — Zustand stores
## Real-time Communication
- WebSocket: Socket.io client (connect đến NestJS backend)
- Connection: Singleton SocketProvider (src/providers/SocketProvider.tsx)
- Events:
  - Client emit: message:send, typing:start, typing:stop, reaction:add, join:channel
  - Server emit: message:new, typing, presence, reaction:updated, unread:count
- Rooms: Join channel room (`channel:${channelId}`) khi vào channel
- Hooks:
  - useSocket (src/hooks/use-socket.ts): Quản lý connect/reconnect
  - useChannelMessages: Combine useInfiniteQuery (history) + WebSocket (new messages)
  - useTyping, usePresence: Subscribe events tương ứng
- Fallback: Nếu WebSocket fail → polling ngắn hạn qua TanStack Query
- Reconnect: Exponential backoff, max 5 lần
## File Uploads & Attachments
- Storage: Cloudinary (ảnh/video, auto-optimize) + AWS S3 (PDF/doc các file khác)
- Flow:
  1. User chọn file trong Editor (button hoặc drag-drop)
  2. Client gửi message trước để có messageId
  3. Client request presigned URL: POST /upload/presigned-url/{s3|cloudinary}
  4. Client upload trực tiếp lên S3/Cloudinary (không qua backend)
  5. Client POST /attachments với { messageId, url, type, name, size, ... }
  6. Backend broadcast 'attachment:added' event qua WebSocket
  7. Frontend update message cache với attachment mới
- Validation: Zod schema (file type, size: image 10MB, video 100MB, file 50MB)
- Preview Components:
  - ImagePreview: Lightbox với zoom, navigate, download (src/components/attachment-previews/)
  - VideoPreview: HTML5 player với controls
  - FilePreview: Icon + name + size + download button
- Hooks: useFileUpload (src/hooks/use-file-upload.ts) — upload với progress tracking
- UI: UploadingFileItem component hiển thị progress bar khi đang upload
## Error Handling
- Global: ErrorBoundary (src/components/ErrorBoundary.tsx) cho client errors
- API errors: Axios interceptor + TanStack Query onError
  - 401: Redirect /login (hoặc refresh token)
  - 403: Show toast "Access denied"
  - 500: Generic error toast
- WebSocket: useSocket hook handle disconnect → retry + toast
- User feedback: shadcn/ui Toast (success, error, loading)
- Server Component errors: error.tsx per route, redirect /login nếu cần
## Testing
- Unit: Jest + React Testing Library (components, hooks)
- E2E: Playwright (auth flow, send message, join channel)
- Mock: MSW (API mocks), socket.io-client (WebSocket mocks)
- Coverage goal: >80% cho hooks, providers
- Scripts: npm test (Jest), npm run e2e (Playwright)
## Performance
- Lazy loading: Dynamic imports cho modals, heavy components
- Pagination: useInfiniteQuery cho messages (50 messages/page)
- Caching: TanStack Query staleTime (5-10s cho channels, 0s cho messages)
- Image optimization: next/image + Cloudinary transforms
- Bundle size: Analyze với @next/bundle-analyzer
- WebSocket: Throttle typing events (500ms), batch presence updates