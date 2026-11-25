import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AudioLines, Bell, CalendarDays, ChartNoAxesCombined, Plus, Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JournalView } from '@/features/journal-view'
import { dateKey, defaultJournal, groupEntries, localTime, parseDay } from '@/lib/journal'
import type { Entry, Journal, Settings } from '@/lib/journal'
import type { Emotion } from '@/lib/emotions'
import { getMessages, localeOf } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'
import { boostScrollRefreshRate } from '@/lib/scroll-refresh'
import { readJournal, writeJournal } from '@/lib/storage'

const Composer = lazy(() => import('@/features/composer'))
const Insights = lazy(() => import('@/features/insights'))
const SettingsView = lazy(() => import('@/features/settings'))
const navigation = [
  { page: 'journal', icon: CalendarDays },
  { page: 'insights', icon: ChartNoAxesCombined },
  { page: 'settings', icon: Settings2 },
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
  const language: Language = journal?.settings.language ?? defaultJournal.settings.language ?? 'it'
  const t = getMessages(language)
  const locale = localeOf(language)
  const reminderSettings = journal?.settings.reminder

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

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
      if (active) setStatus(getMessages(language).status.themeError)
    })
    return () => { active = false }
  }, [color, darkMode, language])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  useEffect(boostScrollRefreshRate, [])

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
      setStatus(getMessages(language).status.saveError)
      return false
    }
  }, [language])

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
        message = settings.message.trim() || getMessages(current.settings.language ?? 'it').status.defaultReminder
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
    if (saved) {
      selectDate(parseDay(entry.day))
      setStatus(t.status.saved)
    }
    return saved
  }

  async function deleteEntry(id: string) {
    const deleted = await mutate((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }))
    if (deleted) setStatus(t.status.deleted)
    return deleted
  }

  async function wipeJournal() {
    const wiped = await mutate(() => ({ ...defaultJournal, settings: { ...defaultJournal.settings, language } }))
    if (wiped) {
      setReminder('')
      selectDate(today)
      setStatus(t.status.wiped)
    }
    return wiped
  }

  const canSeeCalendar = journal?.settings.layout.some(({ id, visible }) => id === 'calendar' && visible)
  const visibleDay = canSeeCalendar ? day : todayKey
  const journalDate = parseDay(visibleDay).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="#journal" aria-label={t.nav.brandAria}>
            <span><AudioLines size={22} /></span> feel<span className="brand-period">.</span>
          </a>
          <nav className="main-nav" aria-label={t.nav.ariaLabel}>
            {navigation.map(({ page: id, icon: Icon }) => (
              <Button key={id} asChild variant="ghost" className="nav-link">
                <a href={`#${id}`} aria-current={page === id ? 'page' : undefined}><Icon />{t.nav[id]}</a>
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
              <h1>{journal?.settings.name.trim() ? t.hero.greetingNamed(journal.settings.name.trim()) : t.hero.greeting}</h1>
              <time className="hero-date" dateTime={visibleDay}><CalendarDays size={15} aria-hidden /> <span>{journalDate}</span></time>
              <Button ref={logButton} className="log-button" disabled={!journal || readError}
                onClick={() => setDraft({ day: visibleDay, id: (draft?.id ?? 0) + 1, open: true })}>
                <Plus /> {t.hero.logMood}
              </Button>
            </div>
          </section>
        )}
        {readError ? (
          <p className="load-message" role="alert">{t.status.storageError} <Button variant="outline" onClick={() => location.reload()}>{t.status.tryAgain}</Button></p>
        ) : journal ? (
          <Suspense fallback={<p className="load-message" role="status">{t.status.loading}</p>}>
            {page === 'journal' && <JournalView day={visibleDay} month={month} onDay={selectDate} onMonth={selectMonth} onDelete={deleteEntry}
              onLog={() => setDraft({ day: visibleDay, id: (draft?.id ?? 0) + 1, open: true })}
              days={days} settings={journal.settings} today={today} language={language} />}
            {page === 'insights' && <Insights journal={journal} today={today} language={language} />}
            {page === 'settings' && <SettingsView settings={journal.settings} onChange={editSettings} onWipe={wipeJournal} language={language} />}
          </Suspense>
        ) : <p className="load-message" role="status">{t.status.opening}</p>}
      </main>
      {draft && journal && (
        <Suspense fallback={null}>
          <Composer key={draft.id} day={draft.day} open={draft.open} savedEmotions={journal.emotions} onSave={saveEntry}
            onOpenChange={(open) => setDraft({ ...draft, open })} onCloseFocus={() => logButton.current?.focus()} language={language} />
        </Suspense>
      )}
      {status && <div className="app-status" role="status">{status}</div>}
      {reminder && (
        <div className="reminder-toast" role="status">
          <Bell size={18} /> <p>{reminder}</p>
          <Button variant="ghost" size="icon-lg" aria-label={t.status.dismissReminder} onClick={() => setReminder('')}><X /></Button>
        </div>
      )}
    </div>
  )
}
