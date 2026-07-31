# Fix: MessageList vẫn bị giật sau các lần sửa trước

## Tổng quan

File cần sửa: `message-list.tsx`

Có 3 vấn đề. Lỗi 1 là nguyên nhân chính gây giật — fix trước.

---

## Lỗi 1 (nguyên nhân chính): `setState` trong `useLayoutEffect` vẫn gây 2 lần render

### Vấn đề

`useLayoutEffect` chạy **sau** khi React commit DOM. Lúc đó Virtuoso đã render với `firstItemIndex` cũ. `setFirstItemIndex` trigger render lần 2, Virtuoso reposition → giật.

```typescript
// ❌ Xóa toàn bộ đoạn này
const [firstItemIndex, setFirstItemIndex] = useState(10000)

useLayoutEffect(() => {
  if (!currentFirstMessageKey) return
  if (!prevFirstKeyRef.current) {
    prevFirstKeyRef.current = currentFirstMessageKey
    return
  }
  if (prevFirstKeyRef.current === currentFirstMessageKey) return
  const anchorIndex = listItems.findIndex(...)
  if (anchorIndex > 0) {
    setFirstItemIndex(prev => prev - anchorIndex) // ❌ setState sau khi Virtuoso đã render
  }
  prevFirstKeyRef.current = currentFirstMessageKey
}, [listItems, currentFirstMessageKey])

// ❌ Xóa luôn dòng này (currentFirstMessageKey tính riêng bên ngoài useMemo)
const currentFirstMessageKey = ...
```

### Fix

Thay `useState` + `useLayoutEffect` bằng cách tính `firstItemIndex` **bên trong `useMemo` cùng lúc với `listItems`**. Đảm bảo Virtuoso nhận đúng index ngay từ render đầu tiên — không có render thứ 2.

**Bước 1:** Thay `useState firstItemIndex` và `useRef prevFirstKeyRef` bằng 2 refs thuần:

```typescript
// ✅ Thay thế — 2 refs này là source of truth, không trigger re-render
const prevFirstKeyRef = useRef<string | null>(null)
const firstItemIndexRef = useRef(10000)
```

**Bước 2:** Gộp toàn bộ logic vào một `useMemo` duy nhất, trả về cả `listItems` lẫn `firstItemIndex`:

```typescript
// ✅ Thay thế toàn bộ useMemo listItems cũ + useLayoutEffect cũ bằng đoạn này
const { listItems, firstItemIndex } = useMemo(() => {
  if (!data?.pages.length) {
    return { listItems: [], firstItemIndex: firstItemIndexRef.current }
  }

  const items = buildListItems(data.pages)
  if (!hasNextPage) {
    items.unshift({ type: 'welcome', conversationId, members, isGroup, createdAt })
  }

  // Tìm key của item đầu tiên
  const currentFirstKey =
    items.find(i => i.type === 'message')?.message.id
    ?? (items[0]?.type === 'date' ? `date-${items[0].date.getTime()}` : 'welcome')
    ?? null

  let newFirstItemIndex = firstItemIndexRef.current

  if (!prevFirstKeyRef.current) {
    // Lần đầu load — reset về 10000
    firstItemIndexRef.current = 10000
    newFirstItemIndex = 10000
  } else if (prevFirstKeyRef.current !== currentFirstKey) {
    // Có items mới được prepend — tìm vị trí anchor cũ trong list mới
    const anchorIndex = items.findIndex(item => {
      const key =
        item.type === 'message' ? item.message.id
        : item.type === 'date' ? `date-${item.date.getTime()}`
        : 'welcome'
      return key === prevFirstKeyRef.current
    })
    if (anchorIndex > 0) {
      newFirstItemIndex = firstItemIndexRef.current - anchorIndex
      firstItemIndexRef.current = newFirstItemIndex
    }
  }

  prevFirstKeyRef.current = currentFirstKey

  return { listItems: items, firstItemIndex: newFirstItemIndex }
}, [data, hasNextPage, conversationId, members, isGroup, createdAt])
```

**Bước 3:** Trong `handleJumpToDate` và `handleJumpToBeginning`, thay `setFirstItemIndex(10000)` bằng:

```typescript
// ✅ Reset ref trực tiếp — không trigger re-render thừa
firstItemIndexRef.current = 10000
prevFirstKeyRef.current = null
```

---

## Lỗi 2: `components` recreate khi `isFetchingNextPage` thay đổi — Virtuoso unmount/remount Header/Footer

### Vấn đề

Dù `ListHeader`/`ListFooter` là stable component, `Header: () => <ListHeader .../>` vẫn là arrow function mới mỗi lần `isFetchingNextPage` thay đổi → Virtuoso unmount rồi remount → layout shift.

```typescript
// ❌ Hiện tại — arrow function mới mỗi lần deps thay đổi
const components = useMemo(
  () => ({
    Header: () => <ListHeader isFetching={isFetchingNextPage} />,
    Footer: () => <ListFooter isFetching={isFetchingPreviousPage} />,
  }),
  [isFetchingNextPage, isFetchingPreviousPage],
)
```

### Fix

Bỏ hẳn spinner ra khỏi `components` của Virtuoso. Đặt loading indicator **bên ngoài Virtuoso** trong JSX — hoàn toàn không ảnh hưởng đến scroll position:

```typescript
// ✅ components deps rỗng — không bao giờ recreate
const stableComponents = useMemo(
  () => ({
    Header: () => <div className="h-8" />, // placeholder cố định giữ chỗ
    Footer: () => <div className="h-8" />,
  }),
  [],
)
```

Và trong JSX, bọc Virtuoso trong flex container, đặt loading indicator ra ngoài:

```tsx
// ✅ Thay thế phần return JSX
return (
  <div className="flex-1 overflow-hidden flex flex-col">
    {/* Loading older — ngoài Virtuoso, không ảnh hưởng scroll */}
    <div className="h-8 flex items-center justify-center shrink-0">
      {isFetchingNextPage && (
        <span className="text-[12px] text-[#797c81] animate-pulse">
          Loading older messages...
        </span>
      )}
    </div>

    <Virtuoso
      ref={virtuosoRef}
      data={listItems}
      firstItemIndex={firstItemIndex}
      initialTopMostItemIndex={initialTopMostItemIndex}
      components={stableComponents}
      alignToBottom={!isJumping && !hasPreviousPage}
      followOutput={(isJumping || hasPreviousPage) ? false : (isAtBottom) => (isAtBottom ? true : false)}
      atTopThreshold={40}
      atBottomThreshold={40}
      increaseViewportBy={{ top: 600, bottom: 600 }}
      rangeChanged={({ startIndex }) => {
        if (startIndex < 15 && hasNextPage && !isFetchingNextPageRef.current) {
          fetchNextPage()
        }
      }}
      startReached={handleStartReached}
      endReached={handleEndReached}
      style={{ height: '100%', overflowAnchor: 'none' }}
      computeItemKey={(_, item) =>
        item.type === 'message'
          ? item.message.id
          : item.type === 'date'
            ? `date-${item.date.getTime()}`
            : 'welcome'
      }
      itemContent={(_, item) => {
        // ... giữ nguyên itemContent như cũ
      }}
    />

    {/* Loading newer — ngoài Virtuoso */}
    <div className="h-8 flex items-center justify-center shrink-0">
      {isFetchingPreviousPage && (
        <span className="text-[12px] text-[#797c81] animate-pulse">
          Loading newer messages...
        </span>
      )}
    </div>

    <JumpToSpecificDateDialog
      open={openJumpToSpecificDateDialog}
      onOpenChange={setOpenJumpToSpecificDateDialog}
      onJump={handleJumpToDate}
      targetCreatedAt={createdAt}
    />
  </div>
)
```

> Đồng thời xóa `ListHeader` và `ListFooter` component khỏi file vì không còn dùng nữa.

---

## Lỗi 3: `initialTopMostItemIndex` khai báo sau early return — vi phạm hooks rules

### Vấn đề

```typescript
if (isLoading) return <MessageSkeleton />
if (listItems.length === 0) return <ChannelWelcome channelId={targetId} />

const initialTopMostItemIndex = listItems.length - 1 // ❌ sau early return
```

Khai báo giá trị sau early return vi phạm Rules of Hooks — mỗi lần điều kiện thay đổi, React có thể tính toán sai thứ tự hooks.

### Fix

Chuyển `initialTopMostItemIndex` lên **trước** các if-guard:

```typescript
// ✅ Đặt ngay sau useMemo listItems, trước if (isLoading)
const initialTopMostItemIndex = listItems.length > 0 ? listItems.length - 1 : 0

if (isLoading) return <MessageSkeleton />
if (listItems.length === 0) return <ChannelWelcome channelId={targetId} />
```

---

## Checklist sau khi sửa

- [ ] `useState firstItemIndex` đã bị xóa — thay bằng `firstItemIndexRef`
- [ ] `useLayoutEffect` cũ đã bị xóa hoàn toàn
- [ ] `useMemo` mới trả về cả `{ listItems, firstItemIndex }` trong một lần tính
- [ ] `handleJumpToDate` và `handleJumpToBeginning` dùng `firstItemIndexRef.current = 10000` thay vì `setFirstItemIndex`
- [ ] `components` (đổi tên thành `stableComponents`) có deps rỗng `[]`
- [ ] Loading indicator đặt bên ngoài Virtuoso trong JSX
- [ ] `ListHeader` và `ListFooter` component đã bị xóa khỏi file
- [ ] `initialTopMostItemIndex` khai báo trước các if-guard
- [ ] `atTopThreshold={40}` — giữ nguyên 40, không tăng
- [ ] `rangeChanged` prop được thêm vào Virtuoso để prefetch sớm khi còn cách đỉnh 15 items