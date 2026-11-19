import assert from 'node:assert/strict'
import test from 'node:test'
import { coreEmotions } from '../src/lib/emotions.ts'
import { compassGrades, dateKey, grade, groupEntries, localTime, parseDay, trend, validGrades, yearDays } from '../src/lib/journal.ts'

test('the compass grades Neutral at the center and one emotion at each corner', () => {
  assert.deepEqual(compassGrades({ x: 0, y: 0 }).map(({ id, value }) => [id, value]), [['neutral', 0]])
  const corners = [[-1, -1, 'joy'], [1, -1, 'anger'], [-1, 1, 'sadness'], [1, 1, 'fear']]
  for (const [x, y, emotion] of corners) {
    assert.deepEqual(compassGrades({ x, y }).map(({ id, value }) => [id, value]), [[emotion, 10]])
  }
  const edge = compassGrades({ x: 0, y: -1 })
  assert.deepEqual(edge.map(({ id, value }) => [id, value]), [['joy', 10], ['anger', 10]])
  assert.ok(validGrades(edge))
})

test('a save needs at least one valid grade', () => {
  for (const value of [0, -1, 11, 1.1, NaN]) assert.equal(validGrades([grade(coreEmotions[0], value)]), false)
  assert.equal(validGrades([]), false)
  assert.ok(validGrades([grade(coreEmotions[0], 1), grade(coreEmotions[1], 10)]))
  assert.ok(validGrades(compassGrades({ x: 0, y: 0 })))
})

test('date keys preserve local calendar days and leap years', () => {
  assert.equal(dateKey(parseDay('2024-02-29')), '2024-02-29')
  assert.equal(localTime(new Date(2024, 2, 1, 8, 3)), '08:03')
  assert.equal(yearDays(2024).length, 366)
  assert.equal(yearDays(2025).length, 365)
  assert.equal(dateKey(yearDays(2025).at(-1)), '2025-12-31')
})

test('trends include all check-ins per date and leave ungraded buckets empty', () => {
  const [joy, sadness] = coreEmotions
  const entries = [
    { day: '2025-12-31', grades: [grade(joy, 4)] },
    { day: '2026-01-04', grades: [grade(joy, 9), grade(sadness, 2)] },
    { day: '2026-01-04', grades: [grade(joy, 7)] },
  ]
  const now = parseDay('2026-01-04')
  const week = trend(entries, 'week', 'joy', now, 1)
  assert.equal(week[0].day, '2025-12-29')
  assert.equal(week[0].value, null)
  assert.equal(week[2].value, 4)
  assert.equal(week[6].value, 8)
  assert.equal(trend(entries, 'week', '', now, 0)[0].value, 6)
  assert.deepEqual(trend(entries, 'quarter', 'joy', now, 1).map(({ value }) => value), [null, 4, 8])
  assert.equal(groupEntries(entries).get('2026-01-04').length, 2)
})
