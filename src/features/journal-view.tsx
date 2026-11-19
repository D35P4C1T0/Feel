import { createContext, useContext } from 'react'
import type { ComponentProps } from 'react'
import { Clock3, NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { dateKey, displayTime, parseDay, peakGrade } from '@/lib/journal'
import type { Entry, Settings } from '@/lib/journal'
import { EmotionIcon } from '@/components/emotion-icon'
import { emotionStyle } from '@/lib/emotions'

const CalendarEntries = createContext(new Map<string, Entry[]>())

function MoodDayButton({ day, children, ...props }: ComponentProps<typeof CalendarDayButton>) {
  const entries = useContext(CalendarEntries).get(dateKey(day.date)) ?? []
  const strongest = entries.length ? entries.map(peakGrade).reduce((best, next) => next.value > best.value ? next : best) : null
  const label = props['aria-label']
  return (
    <CalendarDayButton {...props} day={day} aria-label={strongest ? `${label}, ${entries.length} ${entries.length === 1 ? 'check-in' : 'check-ins'}` : label}>
      <span className="day-number">{children}</span>
      {strongest && <span className="day-dot" style={emotionStyle(strongest.color)} aria-hidden />}
    </CalendarDayButton>
  )
}

export function JournalView({ day, month, onDay, onMonth, days, settings, today }: {
  day: string
  month: Date
  onDay: (date: Date) => void
  onMonth: (date: Date) => void
  days: Map<string, Entry[]>
  settings: Settings
  today: Date
}) {
  const entries = [...(days.get(day) ?? [])].sort((a, b) => a.time.localeCompare(b.time))
  const date = parseDay(day)
  const isToday = day === dateKey(today)
  const layout = settings.layout.filter(({ visible }) => visible)
  const monthEntries = [...days.keys()].filter((key) => key.startsWith(dateKey(month).slice(0, 7))).length

  return (
    <div className={`journal-grid ${layout.length === 1 ? 'journal-grid-single' : ''}`}>
      {layout.map(({ id }) => id === 'calendar' ? (
        <Card key={id} className="panel calendar-panel">
          <CalendarEntries.Provider value={days}>
            <Calendar
              className="journal-calendar"
              mode="single"
              required
              selected={date}
              month={month}
              onMonthChange={onMonth}
              onSelect={onDay}
              weekStartsOn={settings.weekStartsOn}
              today={today}
              fixedWeeks
              formatters={{ formatCaption: (value) => value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }}
              components={{ DayButton: MoodDayButton }}
            />
          </CalendarEntries.Provider>
          <div className="calendar-footer">
            <Button variant="ghost" className="today-button" onClick={() => { onMonth(today); onDay(today) }}>Today</Button>
            <span>{monthEntries} {monthEntries === 1 ? 'day' : 'days'} logged</span>
          </div>
        </Card>
      ) : (
        <Card key={id} className="panel entries-panel">
          <div className="panel-topline"><p className="panel-kicker"><NotebookPen /> Day entries</p></div>
          <h2>{isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long' })}</h2>
          <p className="selected-date"><time dateTime={day}>{date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time></p>
          {entries.length ? (
            <ol className="entry-list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div className="entry-time"><Clock3 size={14} /> <time dateTime={`${day}T${entry.time}`}>{displayTime(entry.time)}</time></div>
                  <div className="entry-grades">
                    {entry.grades.map((item) => (
                      <span className="grade-chip" key={item.id} style={emotionStyle(item.color)}>
                        <EmotionIcon emotion={item} />
                        <span>{item.name}{item.value > 0 && <strong>{item.value}/10</strong>}</span>
                      </span>
                    ))}
                  </div>
                  {entry.note && <p className="entry-note">{entry.note}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <Empty className="day-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon"><NotebookPen /></EmptyMedia>
                <EmptyTitle>No check-ins yet</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        </Card>
      ))}
    </div>
  )
}
