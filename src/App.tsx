import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AudioLines, Bell, CalendarDays, ChartNoAxesCombined, Plus, Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JournalView } from '@/features/journal-view'
import { dateKey, defaultJournal, groupEntries, localTime, parseDay } from '@/lib/journal'
import type { Entry, Journal, Settings } from '@/lib/journal'
import type { Emotion } from '@/lib/emotions'
import { readJournal, writeJournal } from '@/lib/storage'

const Composer = lazy(() => import('@/features/composer'))
const Insights = lazy(() => import('@/features/insights'))
const SettingsView = lazy(() => import('@/features/settings'))
const navigation = [
  { page: 'journal', label: 'Journal', icon: CalendarDays },
  { page: 'insights', label: 'Insights', icon: ChartNoAxesCombined },
  { page: 'settings', label: 'Settings', icon: Settings2 },
] as const

function subscribeRoute(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

function currentPage() {
  const hash = location.hash.slice(1)
  return navigation.find(({ page }) => page === hash)?.page ?? 'journal'
}

export default function App() {
  const page = useSyncExternalStore(subscribeRoute, currentPage)
  const [journal, setJournal] = useState<Journal | null>(null)
  const [readError, setReadError] = useState(false)
  const [todayKey, setTodayKey] = useState(() => dateKey(new Date()))
  const [day, setDay] = useState(todayKey)
  const [month, setMonth] = useState(() => parseDay(todayKey))
  const [draft, setDraft] = useState<{ day: string; id: number; open: boolean } | null>(null)
  const [status, setStatus] = useState('')
  const [reminder, setReminder] = useState('')
  const channel = useRef<BroadcastChannel | null>(null)
  const logButton = useRef<HTMLButtonElement>(null)
  const today = useMemo(() => parseDay(todayKey), [todayKey])
  const days = useMemo(() => groupEntries(journal?.entries ?? []), [journal?.entries])
  const color = journal?.settings.color ?? defaultJournal.settings.color
  const darkMode = journal?.settings.darkMode ?? false
  const reminderSettings = journal?.settings.reminder

  useEffect(() => {
    let active = true
    function refresh() {
      void readJournal().then((value) => {
        if (active) { setJournal(value); setReadError(false) }
      }).catch(() => { if (active) setReadError(true) })
    }
    refresh()
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('feel-journal')
      channel.current.onmessage = refresh
    }
    return () => { active = false; channel.current?.close(); channel.current = null }
  }, [])

  useEffect(() => {
    let active = true
    const root = document.documentElement
    root.classList.toggle('dark', darkMode)
    if (color === defaultJournal.settings.color) {
      document.getElementById('feel-theme')?.remove()
      const background = getComputedStyle(root).getPropertyValue('--background').trim()
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
      return
    }
    void import('@/lib/theme').then(({ applyTheme }) => { if (active) applyTheme(color, darkMode) }).catch(() => {
      if (active) setStatus('Couldn’t load the theme color.')
    })
    return () => { active = false }
  }, [color, darkMode])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  useEffect(() => {
    if (!status) return
    const timeout = window.setTimeout(() => setStatus(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [status])

  const mutate = useCallback(async (change: (current: Journal) => Journal) => {
    try {
      setJournal(await writeJournal(change))
      channel.current?.postMessage('updated')
      return true
    } catch {
      setStatus('Couldn’t save changes on this device.')
      return false
    }
  }, [])

  useEffect(() => {
    let pending = false
    async function tick() {
      const date = new Date()
      const key = dateKey(date)
      setTodayKey(key)
      if (pending || !reminderSettings?.enabled || key === reminderSettings.lastDay || localTime(date) < reminderSettings.time) return
      pending = true
      let message = ''
      const saved = await mutate((current) => {
        const settings = current.settings.reminder
        if (!settings.enabled || settings.lastDay === key || localTime(date) < settings.time) return current
        message = settings.message.trim() || defaultJournal.settings.reminder.message
        return { ...current, settings: { ...current.settings, reminder: { ...settings, lastDay: key } } }
      })
      pending = false
      if (!saved || !message) return
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const registration = await navigator.serviceWorker?.getRegistration()
          if (registration?.active) {
            await registration.showNotification('Feel', { body: message, icon: './icon-192.png', tag: 'feel-reminder' })
            return
          }
          new Notification('Feel', { body: message, tag: 'feel-reminder' })
          return
        }
      } catch { /* Browser notification support varies. */ }
      setReminder(message)
    }
    const check = () => { void tick() }
    check()
    const timer = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check) }
  }, [mutate, reminderSettings])

  function selectDate(date: Date) {
    setDay(dateKey(date))
    setMonth(date)
  }

  function selectMonth(date: Date) {
    const sameMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    selectDate(sameMonth ? today : new Date(date.getFullYear(), date.getMonth(), 1))
  }

  function editSettings(change: (options: Settings) => Settings) {
    return mutate((current) => ({ ...current, settings: change(current.settings) }))
  }

  async function saveEntry(entry: Entry, emotion?: Emotion) {
    const saved = await mutate((current) => ({
      ...current,
      entries: [...current.entries, entry],
      emotions: emotion && !current.emotions.some(({ id }) => id === emotion.id) ? [...current.emotions, emotion] : current.emotions,
    }))
    if (saved) setStatus('Check-in saved.')
    return saved
  }

  async function wipeJournal() {
    const wiped = await mutate(() => defaultJournal)
    if (wiped) {
      setReminder('')
      selectDate(today)
      setStatus('Data deleted.')
    }
    return wiped
  }

  const canSeeCalendar = journal?.settings.layout.some(({ id, visible }) => id === 'calendar' && visible)
  const visibleDay = canSeeCalendar ? day : todayKey
  const journalDate = parseDay(visibleDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="#journal" aria-label="Feel journal">
            <span><AudioLines size={22} /></span> feel<span className="brand-period">.</span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            {navigation.map(({ page: id, label, icon: Icon }) => (
              <Button key={id} asChild variant="ghost" className="nav-link">
                <a href={`#${id}`} aria-current={page === id ? 'page' : undefined}><Icon />{label}</a>
              </Button>
            ))}
          </nav>
        </div>
      </header>
      <main className="main-content" id="main">
        {page === 'journal' && (
          <section className="journal-hero">
            <div className="hero-rings" aria-hidden><i /><i /><i /><i /><i /><i /></div>
            <div className="hero-copy">
              <h1>{journal?.settings.name.trim() ? `How are you feeling, ${journal.settings.name.trim()}?` : 'How are you feeling?'}</h1>
              <Button ref={logButton} className="log-button" disabled={!journal || readError}
                onClick={() => setDraft({ day: visibleDay, id: (draft?.id ?? 0) + 1, open: true })}>
                <Plus /> Log a mood
              </Button>
              <time className="hero-date" dateTime={visibleDay}><CalendarDays size={15} aria-hidden /> <span>{journalDate}</span></time>
            </div>
          </section>
        )}
        {readError ? (
          <p className="load-message" role="alert">Feel couldn’t open local storage. <Button variant="outline" onClick={() => location.reload()}>Try again</Button></p>
        ) : journal ? (
          <Suspense fallback={<p className="load-message" role="status">Loading…</p>}>
            {page === 'journal' && <JournalView day={visibleDay} month={month} onDay={selectDate} onMonth={selectMonth} days={days} settings={journal.settings} today={today} />}
            {page === 'insights' && <Insights journal={journal} today={today} />}
            {page === 'settings' && <SettingsView settings={journal.settings} onChange={editSettings} onWipe={wipeJournal} />}
          </Suspense>
        ) : <p className="load-message" role="status">Opening your journal…</p>}
      </main>
      {draft && journal && (
        <Suspense fallback={null}>
          <Composer key={draft.id} day={draft.day} open={draft.open} savedEmotions={journal.emotions} onSave={saveEntry}
            onOpenChange={(open) => setDraft({ ...draft, open })} onCloseFocus={() => logButton.current?.focus()} />
        </Suspense>
      )}
      {status && <div className="app-status" role="status">{status}</div>}
      {reminder && (
        <div className="reminder-toast" role="status">
          <Bell size={18} /> <p>{reminder}</p>
          <Button variant="ghost" size="icon-lg" aria-label="Dismiss reminder" onClick={() => setReminder('')}><X /></Button>
        </div>
      )}
    </div>
  )
}
