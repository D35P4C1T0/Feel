import { useEffect, useRef, useState } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bell, CalendarDays, Check, ChevronDown, Download, GripVertical, LayoutGrid, Palette, Shield, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { defaultJournal } from '@/lib/journal'
import type { Section, Settings as Preferences } from '@/lib/journal'
import { getMessages, languages, localeOf } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'
import { readJournal } from '@/lib/storage'
import { emotionStyle } from '@/lib/emotions'

const swatches = [
  { name: 'Terracotta', color: defaultJournal.settings.color }, { name: 'Apricot', color: '#cd7c54' },
  { name: 'Moss', color: '#6c8459' }, { name: 'Lagoon', color: '#4d8185' },
  { name: 'Lavender', color: '#8a72b3' }, { name: 'Rose', color: '#b76586' },
]

function SettingsTitle({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <span className="settings-title">
      <span className="settings-icon"><Icon aria-hidden /></span>
      <span>{children}</span>
    </span>
  )
}

function SortableSection({ id, visible, onVisible, label, reorderAria, showAria }: {
  id: Section
  visible: boolean
  onVisible: (visible: boolean) => void
  label: string
  reorderAria: string
  showAria: string
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="layout-row">
      <Button type="button" variant="ghost" size="icon-lg" className="drag-handle" ref={setActivatorNodeRef}
        {...attributes} {...listeners} aria-label={reorderAria}><GripVertical /></Button>
      <Label htmlFor={`show-${id}`}>{label}</Label>
      <Switch id={`show-${id}`} checked={visible} onCheckedChange={onVisible} aria-label={showAria} />
    </li>
  )
}

export default function Settings({ settings, onChange, onWipe, language }: {
  settings: Preferences
  onChange: (change: (current: Preferences) => Preferences) => Promise<boolean>
  onWipe: () => Promise<boolean>
  language: Language
}) {
  const t = getMessages(language).settings
  const defaultReminderMessage = getMessages(language).status.defaultReminder
  const locale = localeOf(language)
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const label = new Date(2023, 0, index + 1).toLocaleDateString(locale, { weekday: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  })
  const deletePhrase = t.deletePhrase
  const [wipeOpen, setWipeOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [wipeError, setWipeError] = useState(false)
  const [exportError, setExportError] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const messageInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fields = [[nameInput.current, settings.name], [messageInput.current, settings.reminder.message]] as const
    for (const [input, value] of fields) {
      if (input && input !== document.activeElement) input.value = value
    }
  }, [settings.name, settings.reminder.message])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function patch(fields: Partial<Preferences>) {
    return onChange((current) => ({ ...current, ...fields }))
  }

  function patchReminder(fields: Partial<Preferences['reminder']>) {
    return onChange((current) => ({ ...current, reminder: { ...current.reminder, ...fields } }))
  }

  async function toggleReminders(enabled: boolean) {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch { /* Use the in-app reminder. */ }
    }
    await patchReminder({ enabled })
  }

  async function download() {
    setExportError(false)
    try {
      const journal = await readJournal()
      const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...journal }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'feel-journal.json'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setExportError(true)
    }
  }

  async function wipe() {
    if (confirmation !== deletePhrase || deleting) return
    setDeleting(true)
    setWipeError(false)
    if (await onWipe()) setWipeOpen(false)
    else setWipeError(true)
    setDeleting(false)
  }

  return (
    <>
      <div className="page-heading"><h1>{t.title}</h1></div>
      <div className="settings-grid">
        <div className="settings-column">
          <Card className="panel settings-panel personalize-card">
            <Collapsible defaultOpen>
              <h2>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="personalize-trigger">
                    <SettingsTitle icon={Palette}>{t.personalize}</SettingsTitle>
                    <span className="personalize-swatch" style={emotionStyle(settings.color)} aria-hidden />
                    <ChevronDown aria-hidden className="personalize-chevron" />
                  </Button>
                </CollapsibleTrigger>
              </h2>
              <CollapsibleContent>
                <div className="personalize-fields">
                  <div className="field">
                    <Label htmlFor="name">{t.yourName}</Label>
                    <Input id="name" ref={nameInput} autoComplete="given-name" placeholder={t.namePlaceholder} defaultValue={settings.name} maxLength={48}
                      onChange={(event) => void patch({ name: event.target.value })} />
                  </div>
                  <div className="field">
                    <Label htmlFor="language">{t.language}</Label>
                    <NativeSelect id="language" value={language}
                      onChange={(event) => void patch({ language: event.target.value as Language })}>
                      {languages.map(({ id, label }) => <option value={id} key={id}>{label}</option>)}
                    </NativeSelect>
                  </div>
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <Label htmlFor="theme-color">{t.themeColor}</Label>
                    <div className="theme-colors">
                      {swatches.map(({ name, color }) => {
                        const swatchLabel = t.swatches[name] ?? name
                        return (
                          <Button key={color} variant="ghost" size="icon-lg" className="color-swatch" style={emotionStyle(color)}
                            aria-label={swatchLabel} title={swatchLabel} aria-pressed={settings.color === color} onClick={() => void patch({ color })}>
                            {settings.color === color && <Check />}
                          </Button>
                        )
                      })}
                      <Input id="theme-color" type="color" value={settings.color} onChange={(event) => void patch({ color: event.target.value })} />
                    </div>
                  </div>
                  <div className="setting-row personalize-dark">
                    <Label htmlFor="dark-mode">{t.darkTheme}</Label>
                    <Switch id="dark-mode" checked={settings.darkMode ?? false} onCheckedChange={(darkMode) => void patch({ darkMode })} />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          <Card className="panel settings-panel journal-layout-panel">
            <h2><SettingsTitle icon={LayoutGrid}>{t.journalLayout}</SettingsTitle></h2>
            <p>{t.journalLayoutDesc}</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return
              void onChange((current) => {
                const from = current.layout.findIndex(({ id }) => id === active.id)
                const to = current.layout.findIndex(({ id }) => id === over.id)
                return { ...current, layout: arrayMove(current.layout, from, to) }
              })
            }}>
              <SortableContext items={settings.layout.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
                <ul className="layout-options">
                  {settings.layout.map((section) => {
                    const label = t.sections[section.id]
                    return (
                      <SortableSection
                        key={section.id}
                        {...section}
                        label={label}
                        reorderAria={t.reorderAria(label)}
                        showAria={t.showAria(label)}
                        onVisible={(visible) =>
                          void onChange((current) => ({
                            ...current,
                            layout: current.layout.map((item) => item.id === section.id ? { ...item, visible } : item),
                          }))
                        }
                      />
                    )
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </Card>
          <Card className="panel settings-panel">
            <h2><SettingsTitle icon={CalendarDays}>{t.calendar}</SettingsTitle></h2>
            <div className="field">
              <Label htmlFor="week-start">{t.firstDayOfWeek}</Label>
              <NativeSelect id="week-start" value={settings.weekStartsOn} onChange={(event) => void patch({ weekStartsOn: Number(event.target.value) as Preferences['weekStartsOn'] })}>
                {weekdays.map((day, index) => <option value={index} key={day}>{day}</option>)}
              </NativeSelect>
            </div>
          </Card>
        </div>
        <div className="settings-column">
          <Card className="panel settings-panel">
            <h2><SettingsTitle icon={Bell}>{t.reminders}</SettingsTitle></h2>
            <div className="setting-row">
              <Label htmlFor="reminder-enabled">{t.dailyReminder}</Label>
              <Switch id="reminder-enabled" checked={settings.reminder.enabled} onCheckedChange={(enabled) => void toggleReminders(enabled)} />
            </div>
            <p>{t.remindersDesc}</p>
            {settings.reminder.enabled && (
              <div className="reminder-fields">
                <div className="field">
                  <Label htmlFor="reminder-time">{t.time}</Label>
                  <Input id="reminder-time" type="time" value={settings.reminder.time}
                    onChange={(event) => { if (event.target.value) void patchReminder({ time: event.target.value }) }} />
                </div>
                <div className="field">
                  <Label htmlFor="reminder-message">{t.message}</Label>
                  <Input id="reminder-message" ref={messageInput} defaultValue={settings.reminder.message} maxLength={120}
                    onChange={(event) => void patchReminder({ message: event.target.value })}
                    placeholder={defaultReminderMessage} />
                </div>
              </div>
            )}
          </Card>
          <Card className="panel settings-panel">
            <h2><SettingsTitle icon={Shield}>{t.yourData}</SettingsTitle></h2>
            <p>{t.yourDataDesc}</p>
            <Button variant="outline" className="setting-action" onClick={() => void download()}><Download /> {t.exportData}</Button>
            {exportError && <p role="alert">{t.exportError}</p>}
          </Card>
          <Card className="panel settings-panel danger-panel">
            <h2><SettingsTitle icon={Trash2}>{t.dangerZone}</SettingsTitle></h2>
            <p>{t.dangerZoneDesc}</p>
            <AlertDialog open={wipeOpen} onOpenChange={(open) => {
              if (deleting) return
              if (open) {
                setConfirmation('')
                setWipeError(false)
              }
              setWipeOpen(open)
            }}>
              <AlertDialogTrigger asChild><Button variant="destructive" className="setting-action">{t.deleteAllData}</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.deleteAllTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.deleteAllDesc}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="field">
                  <Label htmlFor="delete-confirmation">{t.typeToConfirmBefore}<code>{deletePhrase}</code>{t.typeToConfirmAfter}</Label>
                  <Input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={deleting} />
                </div>
                {wipeError && <p role="alert">{t.deleteError}</p>}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
                  <Button variant="destructive" disabled={deleting || confirmation !== deletePhrase} onClick={() => void wipe()}>
                    {deleting ? t.deleting : t.deletePermanently}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      </div>
    </>
  )
}
