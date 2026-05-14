# Kế hoạch: Migrate sang Flat Store Architecture (Slack-style)

## Tại sao cần thay đổi?

`useInfiniteQuery` lưu data theo `pages[]` — mỗi lần prepend 1 trang là toàn bộ cấu trúc thay đổi, buộc Virtuoso phải reconcile lại từ đầu → giật không thể tránh khỏi ở tầng kiến trúc.

Slack dùng **một flat array duy nhất** cho mỗi channel/conversation. Fetch thêm chỉ là `unshift()` hoặc `push()` — Virtuoso nhận thêm items, không cần rebuild gì cả.

---

## Kiến trúc mới (Target)

```
Network Layer (fetch)
       ↓
Message Store (Zustand) — flat array per channel
  messages: { [channelId]: Message[] }
  cursors:  { [channelId]: { older: string | null, newer: string | null } }
  status:   { [channelId]: { loadingOlder: boolean, loadingNewer: boolean, initialized: boolean } }
       ↓
useChannelMessages(channelId) — hook đọc từ store
       ↓
MessageList → Virtuoso
```

So sánh với hiện tại:
```
useInfiniteQuery → pages[] → flatten trong component → Virtuoso
```

---

## Phạm vi thay đổi

### Không thay đổi
- Backend API (`/channels/:id/messages?cursor=&direction=`) — giữ nguyên 100%
- Socket events — giữ nguyên
- `MessageItem`, `DateSeparator`, `ChannelWelcome` — giữ nguyên
- `buildListItems()` — giữ nguyên

### Thay đổi

| File | Loại | Mô tả |
|------|------|-------|
| `stores/useMessageStore.ts` | **TẠO MỚI** | Zustand flat store |
| `hooks/use-channel-messages.ts` | **TẠO MỚI** | Hook kết nối store + fetch + socket |
| `hooks/use-messages.ts` | **SỬA NHỎ** | Giữ lại các mutation hooks (reaction, pin...), xóa `useMessages` |
| `components/message-list.tsx` | **SỬA** | Dùng hook mới thay `useMessages` |

---

## Bước 1: Tạo Zustand Message Store

File: `src/stores/useMessageStore.ts`

```typescript
interface ChannelMessageState {
  messages: Message[]          // flat array, cũ → mới
  olderCursor: string | null   // cursor để fetch tin cũ hơn
  newerCursor: string | null   // cursor để fetch tin mới hơn
  hasOlder: boolean            // còn tin cũ hơn không?
  hasNewer: boolean            // còn tin mới hơn không?
  isInitialized: boolean       // đã fetch lần đầu chưa?
  isLoadingOlder: boolean
  isLoadingNewer: boolean
}

interface MessageStore {
  channels: Record<string, ChannelMessageState>
  
  // Actions
  initialize(channelId: string, messages: Message[], cursors): void
  prependMessages(channelId: string, messages: Message[], olderCursor): void
  appendMessages(channelId: string, messages: Message[], newerCursor): void
  addMessage(channelId: string, message: Message): void
  updateMessage(channelId: string, message: Partial<Message>): void
  removeMessage(channelId: string, messageId: string): void
  setLoadingOlder(channelId: string, loading: boolean): void
  setLoadingNewer(channelId: string, loading: boolean): void
  resetChannel(channelId: string): void  // dùng khi jump to date
  
  // Real-time Actions
  optimisticAdd(channelId: string, message: Message): void
  optimisticUpdate(channelId: string, messageId: string, updates: Partial<Message>): void
  optimisticDelete(channelId: string, messageId: string): void
}
```

**Quy tắc quan trọng:**
- `messages[]` luôn sắp xếp **cũ → mới** (ascending `createdAt`)
- `prependMessages` → `unshift()` vào đầu mảng
- `appendMessages` → `push()` vào cuối mảng
- **Deduplication**: Trước khi thêm bất kỳ tin nhắn nào (từ fetch hoặc socket), luôn kiểm tra `if (messages.find(m => m.id === newMsg.id)) return`.

---

## Bước 1.5: Xử lý Real-time và "Data Gaps"

Đây là phần quan trọng nhất để đạt được trải nghiệm như Slack.

### 1. Cập nhật trạng thái (Edit / Reaction / Delete)
Việc tìm kiếm và cập nhật tin nhắn trong mảng phẳng (O(n)) nhanh hơn nhiều so với lặp lồng qua `pages[]` và `messages[]`. 

### 2. Xử lý "Gap" (Khoảng trống dữ liệu)
- **Kịch bản**: Người dùng đang ở giữa dòng thời gian (sau khi Jump to date). `hasNewer` đang là `true`. Có tin nhắn mới `M_new` tới qua socket.
- **Vấn đề**: Nếu chèn `M_new` vào ngay sau tin nhắn hiện tại, sẽ tạo ra một "lỗ hổng" dữ liệu giữa vị trí hiện tại và `M_new`.
- **Giải pháp (Slack-style)**:
  - Nếu `hasNewer === true`: KHÔNG chèn tin nhắn mới vào store. Chỉ hiển thị thông báo "Có tin nhắn mới bên dưới".
  - Khi người dùng nhấn "Jump to Recent": Xóa toàn bộ `messages[]` của channel đó, fetch trang mới nhất, set `hasNewer = false`.

### 3. Optimistic Updates
Với Zustand, việc thực hiện Optimistic Update cực kỳ đơn giản:
1. Gọi `optimisticUpdate(id, data)` ngay khi user nhấn nút.
2. Gọi API.
3. Nếu API lỗi -> rollback bằng cách fetch lại message đó hoặc dùng bản backup trong store.

---

## Bước 2: Tạo Hook `useChannelMessages`

File: `src/hooks/use-channel-messages.ts`

Hook này thay thế hoàn toàn `useMessages`.

### Trách nhiệm:
1. **Initial fetch** — Fetch page đầu tiên khi mount (nếu chưa initialized)
2. **Expose `fetchOlder()`** — Gọi khi user scroll lên đỉnh
3. **Expose `fetchNewer()`** — Gọi khi user scroll xuống đáy (sau jump)
4. **Socket** — Listen events, dispatch vào store

```typescript
export function useChannelMessages(target: { channelId?: string; conversationId?: string }, userId: string, isConnected: boolean) {
  const channelId = (target.channelId || target.conversationId)!
  const store = useMessageStore()
  const state = store.channels[channelId] ?? DEFAULT_STATE

  // Initial fetch
  useEffect(() => {
    if (state.isInitialized) return
    fetchInitial()
  }, [channelId])

  const fetchOlder = useCallback(async () => {
    if (!state.hasOlder || state.isLoadingOlder) return
    store.setLoadingOlder(channelId, true)
    const res = await fetchMessages(target, state.olderCursor, 'backward')
    store.prependMessages(channelId, res.messages, res.nextCursor)
    store.setLoadingOlder(channelId, false)
  }, [state])

  const fetchNewer = useCallback(async () => {
    if (!state.hasNewer || state.isLoadingNewer) return
    store.setLoadingNewer(channelId, true)
    const res = await fetchMessages(target, state.newerCursor, 'forward')
    store.appendMessages(channelId, res.messages, res.prevCursor)
    store.setLoadingNewer(channelId, false)
  }, [state])

  // Socket handlers — đẩy thẳng vào store
  useChannelChatSocket(target.channelId ?? null, isConnected, {
    onMessage: (msg) => store.addMessage(channelId, msg),
    onMessageUpdated: (msg) => store.updateMessage(channelId, msg),
    onMessageDeleted: (data) => store.removeMessage(channelId, data.messageId),
    // ...
  })

  return {
    messages: state.messages,
    hasOlder: state.hasOlder,
    hasNewer: state.hasNewer,
    isLoadingOlder: state.isLoadingOlder,
    isLoadingNewer: state.isLoadingNewer,
    isInitialized: state.isInitialized,
    fetchOlder,
    fetchNewer,
    jumpToDate,   // reset store rồi fetch mới
    jumpToBeginning,
  }
}
```

---

## Bước 3: Cập nhật `MessageList`

Đây là thay đổi đơn giản nhất vì interface tương tự.

```typescript
// TRƯỚC (useInfiniteQuery)
const { data, isFetchingNextPage, hasNextPage, fetchNextPage, ... } = useMessages(target, ...)
const listItems = useMemo(() => buildListItems(data.pages), [data])

// SAU (flat store)
const { messages, hasOlder, isLoadingOlder, fetchOlder, ... } = useChannelMessages(target, ...)
const listItems = useMemo(() => buildListItems([{ messages }]), [messages])
```

**Lợi ích trực tiếp:**
- `messages` là một flat array — không có `pages[]`
- Khi `fetchOlder()` done, Zustand `prependMessages()` → `messages` thêm items ở đầu
- `buildListItems` chạy lại với array mới → Virtuoso nhận thêm items
- Không cần `firstItemIndex` tracking phức tạp nữa vì Virtuoso có `firstItemIndex` prop chỉ cần tính số items được thêm vào

### Scroll anchoring với flat array (đơn giản hơn nhiều):

```typescript
const prevLengthRef = useRef(0)
const [firstItemIndex, setFirstItemIndex] = useState(10000)

// Khi messages thay đổi — chỉ cần so sánh length
useLayoutEffect(() => {
  const added = messages.length - prevLengthRef.current
  if (added > 0 && prevLengthRef.current > 0) {
    // Có items được prepend — tính thêm bao nhiêu items bao gồm separators
    const addedWithSeparators = listItems.length - prevListLengthRef.current
    setFirstItemIndex(prev => prev - addedWithSeparators)
  }
  prevLengthRef.current = messages.length
}, [messages.length])
```

So với hiện tại phải theo dõi key của từng item — cách này **đơn giản hơn rất nhiều**.

---

## Bước 4: Jump to Date (Thay đổi cốt lõi)

```typescript
const jumpToDate = async (date: Date) => {
  const res = await fetchMessages(target, endOfDay(date).toISOString(), 'backward')
  // Reset toàn bộ store cho channel này, load page mới
  store.resetChannel(channelId)
  store.initialize(channelId, res.messages, res)
  // Scroll lên đầu
  virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start' })
}
```

---

## Thứ tự thực hiện

```
Bước 1: Tạo useMessageStore.ts (Zustand)
  → Verify: store actions hoạt động đúng với unit test thủ công

Bước 2: Tạo useChannelMessages.ts
  → Verify: initial fetch, fetchOlder, socket hoạt động

Bước 3: Cập nhật MessageList để dùng hook mới
  → Verify: cuộn lên không giật, realtime hoạt động

Bước 4: Xóa useMessages() (phần query) khỏi use-messages.ts
  → Giữ lại: useAddReaction, useTogglePin, usePinnedMessages
```

---

## Rủi ro cần lưu ý

| Rủi ro | Giải pháp |
|--------|-----------|
| Memory leak nếu giữ quá nhiều channel trong store | Xóa channel khỏi store khi unmount (`gcTime`) |
| Duplicate messages khi socket và fetch cùng trả về 1 tin | Dedup bằng `Set<id>` trước khi push vào store |
| `buildListItems` chạy lại mỗi khi có 1 tin mới | Wrap trong `useMemo`, chỉ rerun khi `messages.length` hoặc nội dung thay đổi |
| Jump to date làm mất dữ liệu channel đang cache | `resetChannel()` chỉ xóa messages, giữ lại metadata khác |

---

## Kết quả mong đợi sau khi implement

- ✅ Cuộn lên load tin cũ: không giật, không flicker
- ✅ Tin nhắn realtime: thêm vào cuối mảng, không ảnh hưởng scroll position
- ✅ Jump to date: reset store, load page mới, scroll về đầu
- ✅ Code đơn giản hơn đáng kể — không còn `pages[]`, không còn cursor tracking phức tạp
