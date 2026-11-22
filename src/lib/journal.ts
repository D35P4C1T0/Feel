import { constellationEmotions, emotionValue, neutralEmotion, wheelEmotions } from './emotions.ts'
import type { Emotion } from './emotions.ts'
import type { Language } from './i18n.ts'

export type Grade = Emotion & { value: number }
export type Entry = {
  id: string
  day: string
  time: string
  grades: Grade[]
  note: string
  point?: { x: number; y: number }
}
export const sections = { calendar: 'Calendar', entries: 'Day entries' } as const
export type Section = keyof typeof sections
export type Settings = {
  name: string
  color: string
  darkMode?: boolean
  language?: Language
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  layout: { id: Section; visible: boolean }[]
  reminder: { enabled: boolean; time: string; message: string; lastDay?: string }
}
export type Journal = { entries: Entry[]; emotions: Emotion[]; settings: Settings }

export const defaultJournal: Journal = {
  entries: [],
  emotions: [],
  settings: {
    name: '',
    color: '#b6584f',
    darkMode: false,
    language: 'it',
    weekStartsOn: 1,
    layout: [{ id: 'calendar', visible: true }, { id: 'entries', visible: true }],
    reminder: { enabled: false, time: '20:00', message: 'Take a moment to check in with yourself.' },
  },
}

export const noteLimit = 2000

export function dateKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-')
}

export function parseDay(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

export function shiftDays(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
}

export function localTime(date: Date) {
  return [date.getHours(), date.getMinutes()].map((part) => String(part).padStart(2, '0')).join(':')
}

export function displayTime(time: string, locale?: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2000, 0, 1, hours, minutes))
}

export function grade(emotion: Emotion, value: number): Grade {
  return { ...emotionValue(emotion), value }
}

export function wheelGrades({ x, y }: NonNullable<Entry['point']>): Grade[] {
  const radius = Math.min(1, Math.hypot(x, y))
  const intensity = Math.round(radius * 10)
  if (intensity < 1) return [grade(neutralEmotion, 0)]
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  const sector = 360 / wheelEmotions.length
  const rel = ((deg + 30) % 360 + 360) % 360
  const index = Math.floor(rel / sector)
  const frac = (rel % sector) / sector
  const first = wheelEmotions[index % wheelEmotions.length]
  const second = wheelEmotions[(index + 1) % wheelEmotions.length]
  let w1 = 1
  let w2 = 0
  if (frac >= 0.75) {
    w1 = 0
    w2 = 1
  } else if (frac > 0.25) {
    const t = (frac - 0.25) / 0.5
    const c = Math.cos((t * Math.PI) / 2)
    const s = Math.sin((t * Math.PI) / 2)
    const maxW = Math.max(c, s)
    w1 = c / maxW
    w2 = s / maxW
  }
  const result: Grade[] = []
  const v1 = Math.round(intensity * w1)
  const v2 = Math.round(intensity * w2)
  if (v1 > 0) result.push(grade(first, v1))
  if (v2 > 0) result.push(grade(second, v2))
  return result.sort((a, b) => b.value - a.value)
}

export function constellationGrades(values: Record<string, number>, neutral = false): Grade[] {
  if (neutral) return [grade(neutralEmotion, 0)]
  return constellationEmotions
    .flatMap((emotion) => {
      const value = values[emotion.id]
      return value ? [grade(emotion, Math.max(1, Math.min(10, Math.round(value))))] : []
    })
    .sort((a, b) => b.value - a.value)
}

export function validGrades(grades: Grade[]) {
  return grades.length > 0 && grades.every(({ id, value }) =>
    Number.isInteger(value) && (id === 'neutral' ? value === 0 : value >= 1 && value <= 10))
}

export function peakGrade(entry: Entry) {
  return entry.grades.reduce((peak, current) => current.value > peak.value ? current : peak)
}

export function groupEntries(entries: Entry[]) {
  const days = new Map<string, Entry[]>()
  for (const entry of entries) {
    const day = days.get(entry.day) ?? []
    day.push(entry)
    days.set(entry.day, day)
  }
  return days
}

export const periods = [
  { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' },
  { id: 'quarter', label: '3 months' }, { id: 'year', label: 'Year' },
] as const
export type Period = typeof periods[number]['id']

export function trend(entries: Entry[], period: Period, emotionId: string, now: Date, weekStartsOn: number, locale?: string) {
  const year = now.getFullYear()
  const month = now.getMonth()
  const weekStart = shiftDays(now, -(now.getDay() - weekStartsOn + 7) % 7)
  const start = period === 'week' ? weekStart : new Date(year, period === 'year' ? 0 : month - (period === 'quarter' ? 2 : 0), 1)
  const end = period === 'week' ? shiftDays(start, 7) : new Date(year, period === 'year' ? 12 : month + 1, 1)
  const months = period === 'quarter' || period === 'year'
  const buckets = new Map<string, { label: string; sum: number; count: number }>()

  for (let date = start; date < end; date = months ? new Date(date.getFullYear(), date.getMonth() + 1, 1) : shiftDays(date, 1)) {
    const label = new Intl.DateTimeFormat(locale, months ? { month: 'short' } : period === 'week'
      ? { weekday: 'short' } : { day: 'numeric' }).format(date)
    buckets.set(dateKey(date).slice(0, months ? 7 : 10), { label, sum: 0, count: 0 })
  }
  for (const entry of entries) {
    const bucket = buckets.get(entry.day.slice(0, months ? 7 : 10))
    if (!bucket) continue
    for (const { id, value } of entry.grades) {
      if (emotionId && id !== emotionId) continue
      bucket.sum += value
      bucket.count += 1
    }
  }

  return [...buckets].map(([day, { label, sum, count }]) => ({
    day, label, value: count ? Math.round(10 * sum / count) / 10 : null,
  }))
}

export function yearDays(year: number) {
  const dates = []
  for (let day = new Date(year, 0, 1); day.getFullYear() === year; day = shiftDays(day, 1)) {
    dates.push(day)
  }
  return dates
}
