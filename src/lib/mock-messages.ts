/**
 * MOCK DATA — dùng tạm trong Phase 1 khi chưa có backend
 * Sẽ bị xóa sau khi kết nối API thật
 */
import type { Message } from './types'

const MOCK_USER_1 = {
  id: 'user-1',
  name: 'Kiuu',
  avatar: 'https://ca.slack-edge.com/T0A8S4LT7PY-U0A8U5LCTPU-g39fcc9e8a40-48',
  email: 'kiuu@example.com',
}

const MOCK_USER_2 = {
  id: 'user-2',
  name: 'Nam',
  avatar: null,
  email: 'nam@example.com',
}

function makeMsg(
  id: string,
  user: { id: string; name: string; avatar: string | null; email: string },
  content: string,
  minutesAgo: number,
  overrides?: Partial<Message>,
): Message {
  const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
  return {
    id,
    channelId: 'mock-channel',
    user,
    content,
    type: 'text',
    parentId: null,
    editedAt: null,
    deletedAt: null,
    reactions: [],
    attachments: [],
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

export const MOCK_MESSAGES: Message[] = [
  makeMsg('1', MOCK_USER_1, '<p>Chào mọi người! 👋</p>', 120),
  makeMsg('2', MOCK_USER_2, '<p>Chào Kiuu!</p>', 118),
  makeMsg(
    '3',
    MOCK_USER_1,
    '<p>Hôm nay mình sẽ review PR của mọi người nhé</p>',
    117,
  ),
  makeMsg(
    '4',
    MOCK_USER_1,
    '<p>Có bạn nào chưa tạo PR không?</p>',
    116,
    // compact: cùng user, cách nhau < 5 phút
  ),
  makeMsg(
    '5',
    MOCK_USER_2,
    '<p>Mình xong rồi, bạn có thể review giúp mình được không?</p>',
    100,
  ),
  makeMsg(
    '6',
    MOCK_USER_1,
    '<p>Được, link PR đâu bạn?</p>',
    99,
  ),
  makeMsg(
    '7',
    MOCK_USER_2,
    '<p><a href="#">https://github.com/org/repo/pull/42</a></p>',
    98,
  ),
  makeMsg(
    '8',
    MOCK_USER_1,
    '<p>Đây là đoạn code mình đã thêm:</p><pre><code>const handler = async (req, res) => {\n  const data = await fetchData()\n  return res.json(data)\n}</code></pre>',
    60,
  ),
  makeMsg(
    '9',
    MOCK_USER_2,
    '<p>Trông ổn đó! Nhưng nên thêm <strong>error handling</strong> vào nhé</p>',
    55,
  ),
  makeMsg(
    '10',
    MOCK_USER_1,
    '<p>Đúng rồi, mình sẽ sửa ngay</p>',
    54,
  ),
  makeMsg(
    '11',
    MOCK_USER_2,
    '<p>Cảm ơn bạn nhiều! 🙏</p>',
    10,
    {
      reactions: [
        { emoji: '👍', count: 2, userIds: ['user-1', 'user-2'] },
        { emoji: '❤️', count: 1, userIds: ['user-1'] },
      ],
    },
  ),
  makeMsg(
    '12',
    MOCK_USER_1,
    '<p>Không có gì 😊</p>',
    2,
  ),
]
