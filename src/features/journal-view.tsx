import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { Clock3, NotebookPen, Plus, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { dateKey, displayTime, parseDay, peakGrade } from '@/lib/journal'
import type { Entry, Settings } from '@/lib/journal'
import { EmotionIcon } from '@/components/emotion-icon'
import { emotionStyle } from '@/lib/emotions'
import { emotionLabel, getMessages, localeOf } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'

const CalendarContext = createContext<{ days: Map<string, Entry[]>; language: Language }>({
  days: new Map(),
  language: 'it',
})

function MoodDayButton({ day, children, ...props }: ComponentProps<typeof CalendarDayButton>) {
  const { days, language } = useContext(CalendarContext)
  const t = getMessages(language).journal
  const entries = days.get(dateKey(day.date)) ?? []
  const strongest = entries.length ? entries.map(peakGrade).reduce((best, next) => next.value > best.value ? next : best) : null
  const label = props['aria-label']
  return (
    <CalendarDayButton {...props} day={day} aria-label={strongest ? `${label}, ${t.checkInCount(entries.length)}` : label}>
      <span className="day-number">{children}</span>
      {strongest && <span className="day-dot" style={emotionStyle(strongest.color)} aria-hidden />}
    </CalendarDayButton>
  )
}

function EntryNote({ note, language }: { note: string; language: Language }) {
  const t = getMessages(language).journal
  const id = useId()
  const text = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)

  useEffect(() => {
    const paragraph = text.current
    if (!paragraph) return
    const measure = () => {
      if (!paragraph.isConnected) return
      const twoLines = Math.ceil(parseFloat(getComputedStyle(paragraph).lineHeight) * 2)
      setCanExpand(paragraph.scrollHeight > twoLines)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(paragraph)
    void document.fonts.ready.then(measure)
    return () => observer.disconnect()
  }, [note])

  return (
    <>
      <p ref={text} id={id} className="entry-note" data-expanded={expanded}>{note}</p>
      {canExpand && (
        <Button variant="link" size="sm" className="entry-note-toggle" aria-expanded={expanded}
          aria-controls={id} onClick={() => setExpanded(!expanded)}>
          {expanded ? t.showLess : t.showMore}
        </Button>
      )}
    </>
  )
}

export function JournalView({ day, month, onDay, onMonth, onDelete, onLog, days, settings, today, language }: {
  day: string
  month: Date
  onDay: (date: Date) => void
  onMonth: (date: Date) => void
  onDelete: (id: string) => Promise<boolean>
  onLog: () => void
  days: Map<string, Entry[]>
  settings: Settings
  today: Date
  language: Language
}) {
  const t = getMessages(language).journal
  const locale = localeOf(language)
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const deleteTrigger = useRef<HTMLButtonElement>(null)
  const dayHeading = useRef<HTMLHeadingElement>(null)
  const entries = [...(days.get(day) ?? [])].sort((a, b) => a.time.localeCompare(b.time))
  const date = parseDay(day)
  const isToday = day === dateKey(today)
  const layout = settings.layout.filter(({ visible }) => visible)
  const monthEntries = [...days.keys()].filter((key) => key.startsWith(dateKey(month).slice(0, 7))).length

  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setDeleteError(false)
    if (await onDelete(deleteTarget.id)) setDeleteTarget(null)
    else setDeleteError(true)
    setDeleting(false)
  }

  const weekdayTitle = date.toLocaleDateString(locale, { weekday: 'long' })
  const capitalizedWeekday = weekdayTitle.charAt(0).toUpperCase() + weekdayTitle.slice(1)

  return (
    <div className={`journal-grid ${layout.length === 1 ? 'journal-grid-single' : ''}`}>
      {layout.map(({ id }) => id === 'calendar' ? (
        <Card key={id} className="panel calendar-panel">
          <CalendarContext.Provider value={{ days, language }}>
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
              formatters={{
                formatCaption: (value) => {
                  const caption = value.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
                  return caption.charAt(0).toUpperCase() + caption.slice(1)
                },
                formatWeekdayName: (value) => value.toLocaleDateString(locale, { weekday: 'short' }),
              }}
              components={{ DayButton: MoodDayButton }}
            />
          </CalendarContext.Provider>
          <div className="calendar-footer">
            <Button variant="ghost" className="today-button" onClick={() => { onMonth(today); onDay(today) }}>{t.today}</Button>
            <span>{t.daysLogged(monthEntries)}</span>
          </div>
        </Card>
      ) : (
        <Card key={id} className="panel entries-panel">
          <div className="panel-topline">
            <p className="panel-kicker"><NotebookPen /> {t.dayEntries}</p>
            <Button variant="ghost" size="sm" className="today-button" onClick={onLog}><Plus size={15} /> {t.log}</Button>
          </div>
          <h2 ref={dayHeading} tabIndex={-1}>{isToday ? t.today : capitalizedWeekday}</h2>
          <p className="selected-date"><time dateTime={day}>{date.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}</time></p>
          {entries.length ? (
            <ol className="entry-list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <div className="entry-time"><Clock3 size={14} /> <time dateTime={`${day}T${entry.time}`}>{displayTime(entry.time, locale)}</time></div>
                    <div className="entry-grades">
                      {entry.grades.map((item) => (
                        <span className="grade-chip" key={item.id} style={emotionStyle(item.color)}>
                          <EmotionIcon emotion={item} />
                          <span>{emotionLabel(item, language)}{item.value > 0 && <strong>{item.value}/10</strong>}</span>
                        </span>
                      ))}
                    </div>
                    {entry.note && <EntryNote note={entry.note} language={language} />}
                  </div>
                  <Button variant="ghost" size="icon-lg" className="entry-delete" aria-haspopup="dialog"
                    aria-label={t.deleteAria(displayTime(entry.time, locale))} onClick={(event) => {
                      deleteTrigger.current = event.currentTarget
                      setDeleteError(false)
                      setDeleteTarget(entry)
                    }}><Trash2 aria-hidden /></Button>
                </li>
              ))}
            </ol>
          ) : (
            <Empty className="day-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon"><NotebookPen /></EmptyMedia>
                <EmptyTitle>{t.noCheckIns}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        </Card>
      ))}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}>
        <AlertDialogContent onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (deleteTrigger.current?.isConnected) deleteTrigger.current.focus()
          else dayHeading.current?.focus()
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert">{t.deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? t.deleting : t.deleteConfirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
