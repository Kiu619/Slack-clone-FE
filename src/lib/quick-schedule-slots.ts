import { addDays, isMonday, startOfDay } from 'date-fns'

const atNineLocal = (d: Date) => {
  const out = new Date(d)
  out.setHours(9, 0, 0, 0)
  return out
}

/** Ngày mai 09:00 theo giờ local (cùng quy ước với ScheduleSendDialog `combineDateAndHHmm`). */
export const computeTomorrowNineAmLocal = (now = new Date()): Date => {
  const sod = startOfDay(now)
  let slot = atNineLocal(addDays(sod, 1))
  if (slot.getTime() <= now.getTime()) {
    slot = atNineLocal(addDays(sod, 2))
  }
  return slot
}

/**
 * Thứ Hai tới 09:00 local: nếu hôm nay là thứ Hai và chưa qua 9h thì dùng hôm nay;
 * ngược lại là thứ Hai tuần sau hoặc thứ Hai gần nhất phía trước.
 */
export const computeNextMondayNineAmLocal = (now = new Date()): Date => {
  const sod = startOfDay(now)
  if (isMonday(sod)) {
    const thisMon = atNineLocal(sod)
    if (now.getTime() < thisMon.getTime()) return thisMon
    return atNineLocal(addDays(sod, 7))
  }
  const d = sod.getDay()
  const delta = d === 0 ? 1 : (8 - d) % 7
  return atNineLocal(addDays(sod, delta))
}
