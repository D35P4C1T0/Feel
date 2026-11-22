import { useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, PointerEvent, Ref } from 'react'
import { ArrowLeft, CalendarDays, Check, Clock3, NotebookPen, Plus, X } from 'lucide-react'
import { EmotionIcon } from '@/components/emotion-icon'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { complexEmotions, constellationEmotions, emotionStyle, entryModes, neutralEmotion, wheelEmotions } from '@/lib/emotions'
import type { Emotion } from '@/lib/emotions'
import { emotionLabel, getMessages } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'
import { constellationGrades, dateKey, grade, localTime, noteLimit, validGrades, wheelGrades } from '@/lib/journal'
import type { Entry, Grade } from '@/lib/journal'

type Mode = typeof entryModes[number]['id']
type Point = NonNullable<Entry['point']>
type ConstellationState = { values: Record<string, number>; order: string[]; neutral: boolean }

const center: Point = { x: 0, y: 0 }
const emptyConstellation: ConstellationState = { values: {}, order: [], neutral: false }
const maxOrbs = 3
const wheelCx = 180
const wheelCy = 114
const wheelRadius = 80
const constellationRadius = 76

const circumplexSpokes = wheelEmotions.map((emotion, index) => ({
  emotion,
  rad: ((-30 + index * 60) * Math.PI) / 180,
}))

const constellationSpokes = constellationEmotions.map((emotion, index) => ({
  emotion,
  rad: ((-90 + index * 30) * Math.PI) / 180,
}))

function blendHexColors(grades: Grade[]) {
  if (!grades.length || grades[0].id === 'neutral') return neutralEmotion.color
  let r = 0, g = 0, b = 0, total = 0
  for (const item of grades) {
    const w = item.value || 1
    const hex = item.color.replace('#', '')
    r += parseInt(hex.slice(0, 2), 16) * w
    g += parseInt(hex.slice(2, 4), 16) * w
    b += parseInt(hex.slice(4, 6), 16) * w
    total += w
  }
  return `rgb(${Math.round(r / total)} ${Math.round(g / total)} ${Math.round(b / total)})`
}

function WheelPicker({ point, onPoint, language }: {
  point: Point | null
  onPoint: (point: Point) => void
  language: Language
}) {
  const t = getMessages(language).composer
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const { x, y } = point ?? center
  const grades = point ? wheelGrades(point) : []
  const activeColor = blendHexColors(grades)
  const activeIds = new Set(grades.map((item) => item.id))
  const px = wheelCx + x * wheelRadius
  const py = wheelCy + y * wheelRadius

  function updateFromEvent(event: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect()
    const sx = ((event.clientX - rect.left) / rect.width) * 360
    const sy = ((event.clientY - rect.top) / rect.height) * 228
    let dx = (sx - wheelCx) / wheelRadius
    let dy = (sy - wheelCy) / wheelRadius
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    onPoint({ x: dx, y: dy })
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const step = event.shiftKey ? 0.2 : 0.1
    let dx = 0
    let dy = 0
    if (event.key === 'ArrowLeft') dx = -step
    else if (event.key === 'ArrowRight') dx = step
    else if (event.key === 'ArrowUp') dy = -step
    else if (event.key === 'ArrowDown') dy = step
    else if (event.key === 'Home' || event.key === '0') {
      event.preventDefault()
      onPoint(center)
      return
    } else return
    event.preventDefault()
    let nx = x + dx
    let ny = y + dy
    const len = Math.hypot(nx, ny)
    if (len > 1) {
      nx /= len
      ny /= len
    }
    onPoint({ x: nx, y: ny })
  }

  return (
    <div className="picker-stack">
      <div className="mood-constellation" data-vaul-no-drag="">
        <svg
          ref={svgRef}
          viewBox="0 0 360 228"
          tabIndex={0}
          role="application"
          aria-label={t.wheelAria}
          className="wheel-svg"
          onPointerDown={(event) => {
            dragging.current = true
            svgRef.current?.setPointerCapture(event.pointerId)
            updateFromEvent(event)
          }}
          onPointerMove={(event) => {
            if (dragging.current) updateFromEvent(event)
          }}
          onPointerUp={() => { dragging.current = false }}
          onPointerCancel={() => { dragging.current = false }}
          onKeyDown={handleKeyDown}
        >
          <defs>
            <radialGradient id="wheel-glow" cx={`${((px / 360) * 100).toFixed(1)}%`} cy={`${((py / 228) * 100).toFixed(1)}%`} r="46%">
              <stop offset="0%" stopColor={activeColor} stopOpacity={point ? 0.36 : 0.08} />
              <stop offset="100%" stopColor={activeColor} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={wheelCx} cy={wheelCy} r={wheelRadius} fill="url(#wheel-glow)" />
          <circle cx={wheelCx} cy={wheelCy} r={wheelRadius} className="constellation-ring" />
          <circle cx={wheelCx} cy={wheelCy} r={wheelRadius * 0.66} className="constellation-ring constellation-ring-inner" />
          <circle cx={wheelCx} cy={wheelCy} r={wheelRadius * 0.33} className="constellation-ring constellation-ring-inner" />

          {circumplexSpokes.map(({ emotion, rad }) => {
            const ax = wheelCx + Math.cos(rad) * wheelRadius
            const ay = wheelCy + Math.sin(rad) * wheelRadius
            const isVertical = Math.abs(Math.cos(rad)) < 0.2
            const lx = wheelCx + Math.cos(rad) * (wheelRadius + 16)
            const ly = isVertical
              ? wheelCy + Math.sin(rad) * (wheelRadius + 16) + (Math.sin(rad) > 0 ? 4 : -1)
              : wheelCy + Math.sin(rad) * (wheelRadius + 14) + 4
            const anchor = isVertical ? 'middle' : Math.cos(rad) > 0 ? 'start' : 'end'
            const isActive = activeIds.has(emotion.id)
            return (
              <g key={emotion.id}>
                <line
                  x1={wheelCx}
                  y1={wheelCy}
                  x2={ax}
                  y2={ay}
                  stroke={emotion.color}
                  strokeOpacity={isActive ? 0.6 : 0.22}
                  strokeWidth={isActive ? 1.8 : 1}
                />
                <circle cx={ax} cy={ay} r={isActive ? 5 : 3.5} fill={emotion.color} fillOpacity={isActive ? 1 : 0.65} />
                <text x={lx} y={ly} textAnchor={anchor} className="constellation-label" data-active={isActive}>
                  {emotionLabel(emotion, language)}
                </text>
              </g>
            )
          })}

          {point && <line x1={wheelCx} y1={wheelCy} x2={px} y2={py} stroke={activeColor} strokeWidth={2} strokeOpacity={0.75} />}
          <circle cx={wheelCx} cy={wheelCy} r={3.2} className="constellation-center" data-neutral={Boolean(point && grades[0]?.id === 'neutral')} />
          <circle
            cx={px}
            cy={py}
            r={8.5}
            fill={point ? 'var(--card)' : 'transparent'}
            stroke={point ? activeColor : 'var(--muted-foreground)'}
            strokeWidth={2.5}
          />
        </svg>
      </div>
      <div className="compass-result" data-neutral={!point || grades[0]?.id === 'neutral'}>
        <p aria-live="polite">
          {point
            ? grades.map((item) => item.id === 'neutral' ? emotionLabel(item, language) : `${emotionLabel(item, language)}\u00a0${item.value}/10`).join(' · ')
            : t.wheelHint}
        </p>
        <Button type="button" variant="ghost" onClick={() => onPoint(center)}>{t.center}</Button>
      </div>
    </div>
  )
}

function setOrbValue(state: ConstellationState, id: string, value: number): ConstellationState {
  if (value <= 0) {
    const values = { ...state.values }
    delete values[id]
    return { values, order: state.order.filter((item) => item !== id), neutral: false }
  }
  const nextOrder = state.order.includes(id) ? state.order : [...state.order, id]
  const values = { ...state.values, [id]: value }
  if (nextOrder.length > maxOrbs) {
    const removed = nextOrder.shift()
    if (removed) delete values[removed]
  }
  return { values, order: nextOrder, neutral: false }
}

function ConstellationPicker({ state, onChange, language }: {
  state: ConstellationState
  onChange: (next: ConstellationState) => void
  language: Language
}) {
  const t = getMessages(language).composer
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingId = useRef<string | null>(null)
  const grades = constellationGrades(state.values, state.neutral)
  const blend = blendHexColors(grades)

  const orbs = constellationSpokes.flatMap(({ emotion, rad }) => {
    const value = state.values[emotion.id]
    if (!value) return []
    const dist = (value / 10) * constellationRadius
    return [{ emotion, value, x: wheelCx + Math.cos(rad) * dist, y: wheelCy + Math.sin(rad) * dist }]
  })

  function svgCoords(event: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * 360,
      y: ((event.clientY - rect.top) / rect.height) * 228,
    }
  }

  function projectToSpoke(id: string, x: number, y: number, allowRemove: boolean) {
    const spoke = constellationSpokes.find(({ emotion }) => emotion.id === id)
    if (!spoke) return
    const proj = (x - wheelCx) * Math.cos(spoke.rad) + (y - wheelCy) * Math.sin(spoke.rad)
    if (allowRemove && proj < constellationRadius * 0.08) {
      onChange(setOrbValue(state, id, 0))
      return
    }
    const value = Math.max(1, Math.min(10, Math.round((proj / constellationRadius) * 10)))
    onChange(setOrbValue(state, id, value))
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    const target = event.target as Element
    const orbEl = target.closest<SVGElement>('[data-orb]')
    if (orbEl?.dataset.orb) {
      draggingId.current = orbEl.dataset.orb
      svgRef.current?.setPointerCapture(event.pointerId)
      return
    }
    const toggleEl = target.closest<SVGElement>('[data-toggle]')
    if (toggleEl?.dataset.toggle) {
      const id = toggleEl.dataset.toggle
      onChange(setOrbValue(state, id, state.values[id] ? 0 : 6))
      return
    }
    const { x, y } = svgCoords(event)
    const dist = Math.hypot(x - wheelCx, y - wheelCy)
    if (dist < 14) {
      onChange({ values: {}, order: [], neutral: true })
      return
    }
    if (dist > constellationRadius + 16) return
    let nearest = constellationSpokes[0]
    let bestDot = -Infinity
    for (const spoke of constellationSpokes) {
      const dot = (x - wheelCx) * Math.cos(spoke.rad) + (y - wheelCy) * Math.sin(spoke.rad)
      if (dot > bestDot) {
        bestDot = dot
        nearest = spoke
      }
    }
    draggingId.current = nearest.emotion.id
    svgRef.current?.setPointerCapture(event.pointerId)
    projectToSpoke(nearest.emotion.id, x, y, false)
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!draggingId.current) return
    const { x, y } = svgCoords(event)
    projectToSpoke(draggingId.current, x, y, true)
  }

  function handlePointerUp() {
    draggingId.current = null
  }

  function handleNodeKeyDown(event: KeyboardEvent<SVGGElement>, id: string) {
    const current = state.values[id] ?? 0
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onChange(setOrbValue(state, id, current ? 0 : 6))
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      onChange(setOrbValue(state, id, Math.min(10, current + 1)))
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      onChange(setOrbValue(state, id, Math.max(0, current - 1)))
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      onChange(setOrbValue(state, id, 0))
    }
  }

  return (
    <div className="picker-stack">
      <div className="mood-constellation" data-vaul-no-drag="">
        <svg
          ref={svgRef}
          viewBox="0 0 360 228"
          role="group"
          aria-label={t.constellationAria}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <radialGradient id="constellation-aura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={blend} stopOpacity={orbs.length ? 0.32 : 0.08} />
              <stop offset="100%" stopColor={blend} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={wheelCx} cy={wheelCy} r={constellationRadius} fill="url(#constellation-aura)" />
          <circle cx={wheelCx} cy={wheelCy} r={constellationRadius} className="constellation-ring" />
          <circle cx={wheelCx} cy={wheelCy} r={constellationRadius * 0.5} className="constellation-ring constellation-ring-inner" />

          {orbs.length >= 2 && (
            <polygon
              points={orbs.map((orb) => `${orb.x},${orb.y}`).join(' ')}
              fill={blend}
              fillOpacity={0.18}
              stroke={blend}
              strokeWidth={1.6}
              strokeOpacity={0.7}
            />
          )}

          {constellationSpokes.map(({ emotion, rad }) => {
            const val = state.values[emotion.id] ?? 0
            const ax = wheelCx + Math.cos(rad) * constellationRadius
            const ay = wheelCy + Math.sin(rad) * constellationRadius
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            const isVertical = Math.abs(cos) < 0.15
            const lx = wheelCx + cos * (constellationRadius + 15)
            const ly = isVertical
              ? wheelCy + sin * (constellationRadius + 15) + (sin > 0 ? 5 : -2)
              : wheelCy + sin * (constellationRadius + 14) + 3.5
            const anchor = isVertical ? 'middle' : cos > 0 ? 'start' : 'end'
            return (
              <g key={emotion.id}>
                <line
                  x1={wheelCx}
                  y1={wheelCy}
                  x2={ax}
                  y2={ay}
                  stroke={emotion.color}
                  strokeOpacity={val ? 0.6 : 0.18}
                  strokeWidth={val ? 1.8 : 1}
                />
                <g
                  className="constellation-node"
                  data-toggle={emotion.id}
                  data-active={val > 0}
                  tabIndex={0}
                  role="slider"
                  aria-label={emotionLabel(emotion, language)}
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={val}
                  aria-valuetext={t.constellationValue(emotionLabel(emotion, language), val)}
                  onKeyDown={(event) => handleNodeKeyDown(event, emotion.id)}
                >
                  <circle cx={ax} cy={ay} r={12} fill="transparent" />
                  <circle cx={ax} cy={ay} r={val ? 4.5 : 3.8} fill={val ? emotion.color : 'var(--card)'} stroke={emotion.color} strokeWidth={1.6} />
                  <text x={lx} y={ly} textAnchor={anchor} className="constellation-label constellation-label-dense">{emotionLabel(emotion, language)}</text>
                </g>
              </g>
            )
          })}

          <circle
            cx={wheelCx}
            cy={wheelCy}
            r={state.neutral ? 5.5 : 3.2}
            className="constellation-center"
            data-neutral={state.neutral}
          />

          {orbs.map(({ emotion, value, x, y }) => (
            <g key={emotion.id} className="constellation-orb" data-orb={emotion.id}>
              <circle cx={x} cy={y} r={18} fill="transparent" />
              <circle cx={x} cy={y} r={11} fill={emotion.color} stroke="var(--card)" strokeWidth={2.25} />
              <text x={x} y={y + 3.6} textAnchor="middle" className="constellation-orb-value">{value}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="compass-result" data-neutral={!grades.length || state.neutral}>
        <p aria-live="polite">
          {grades.length
            ? grades.map((item) => item.id === 'neutral' ? emotionLabel(item, language) : `${emotionLabel(item, language)}\u00a0${item.value}/10`).join(' · ')
            : t.constellationHint}
        </p>
        <Button type="button" variant="ghost" onClick={() => onChange({ values: {}, order: [], neutral: true })}>{t.neutral}</Button>
      </div>
    </div>
  )
}

function EmotionChoices({ options, selected, onSelect, language }: {
  options: Emotion[]
  selected: Emotion | null
  onSelect: (emotion: Emotion) => void
  language: Language
}) {
  return (
    <div className="emotion-choices">
      {options.map((emotion) => (
        <Button key={emotion.id} type="button" variant="outline" className="emotion-choice"
          aria-pressed={selected?.id === emotion.id} onClick={() => onSelect(emotion)}>
          <EmotionIcon emotion={emotion} />
          <span>{emotionLabel(emotion, language)}</span>
        </Button>
      ))}
    </div>
  )
}

function Intensity({ emotion, value, onValue, fieldsetRef, language }: {
  emotion: Emotion
  value?: number
  onValue: (value: number, fromKeyboard: boolean) => void
  fieldsetRef?: Ref<HTMLFieldSetElement>
  language: Language
}) {
  const t = getMessages(language).composer
  return (
    <fieldset ref={fieldsetRef} tabIndex={fieldsetRef ? -1 : undefined} className="intensity" style={emotionStyle(emotion.color)}>
      <legend>{t.intensityLegend(emotionLabel(emotion, language))}</legend>
      <div className="intensity-values">
        {Array.from({ length: 10 }, (_, i) => (
          <Button key={i} type="button" variant="outline" aria-pressed={value === i + 1}
            onClick={(event) => onValue(i + 1, event.detail === 0)}>{i + 1}</Button>
        ))}
      </div>
      <div className="intensity-labels"><span>{t.subtle}</span><span>{t.intense}</span></div>
    </fieldset>
  )
}

export default function Composer({ day, open, onOpenChange, onCloseFocus, savedEmotions, onSave, language }: {
  day: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseFocus: () => void
  savedEmotions: Emotion[]
  onSave: (entry: Entry, emotion?: Emotion) => Promise<boolean>
  language: Language
}) {
  const t = getMessages(language).composer
  const [mode, setMode] = useState<Mode>('wheel')
  const [point, setPoint] = useState<Point | null>(null)
  const [constellation, setConstellation] = useState<ConstellationState>(emptyConstellation)
  const [complex, setComplex] = useState<Grade | null>(null)
  const complexIntensity = useRef<HTMLFieldSetElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [personal, setPersonal] = useState(false)
  const [personalName, setPersonalName] = useState('')
  const [personalColor, setPersonalColor] = useState('#9671a9')
  const [personalValue, setPersonalValue] = useState(0)
  const [reuse, setReuse] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const notesInput = useRef<HTMLTextAreaElement>(null)
  const [notes, setNotes] = useState('')
  const [todayKey] = useState(() => dateKey(new Date()))
  const [entryDay, setEntryDay] = useState(day)
  const [time, setTime] = useState(() => localTime(new Date()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const isToday = entryDay === todayKey
  const personalEmotion = { id: 'personal', name: personalName.trim(), color: personalColor }
  const grades = {
    wheel: point ? wheelGrades(point) : [],
    custom: constellationGrades(constellation.values, constellation.neutral),
    complex: personal
      ? personalEmotion.name && personalValue ? [grade(personalEmotion, personalValue)] : []
      : complex?.value ? [complex] : [],
  }[mode]
  const canSave = validGrades(grades) && Boolean(entryDay) && entryDay <= todayKey

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    setError(false)
    const customEmotion = mode === 'complex' && personal
      ? savedEmotions.find((emotion) => emotion.name.toLowerCase() === personalEmotion.name.toLowerCase() &&
        emotion.color === personalEmotion.color) ?? { ...personalEmotion, id: crypto.randomUUID() }
      : undefined
    const keptGrades = customEmotion ? [grade(customEmotion, personalValue)] : grades
    const entry: Entry = {
      id: crypto.randomUUID(),
      day: entryDay,
      time: time || localTime(new Date()),
      grades: keptGrades,
      note: notes.trim(),
      ...(mode === 'wheel' && point ? { point } : {}),
    }
    if (await onSave(entry, reuse ? customEmotion : undefined)) onOpenChange(false)
    else setError(true)
    setSaving(false)
  }

  return (
    <Drawer open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }} autoFocus>
      <DrawerContent className="composer" data-notes={notesOpen}
        onOpenAutoFocus={(event) => { event.preventDefault(); closeButton.current?.focus() }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onCloseFocus() }}>
        <Collapsible open={notesOpen} onOpenChange={(next) => {
          setNotesOpen(next)
          if (next) requestAnimationFrame(() => notesInput.current?.focus())
        }} asChild>
          <form className="composer-form" onSubmit={submit}>
            <DrawerHeader className="composer-header">
              <DrawerTitle>{isToday ? t.titleToday : t.titlePast}</DrawerTitle>
              <DrawerClose asChild><Button ref={closeButton} variant="ghost" size="icon-lg" aria-label={t.closeAria} disabled={saving}><X /></Button></DrawerClose>
              <DrawerDescription className="sr-only">{t.description}</DrawerDescription>
              <div className="datetime-fields" data-vaul-no-drag="">
                <div className="date-field">
                  <Label htmlFor="entry-day"><CalendarDays size={15} aria-hidden /><span className="sr-only">{t.dateLabel}</span></Label>
                  <Input id="entry-day" type="date" max={todayKey} value={entryDay}
                    onChange={(event) => { if (event.target.value && event.target.value <= todayKey) setEntryDay(event.target.value) }} />
                </div>
                <div className="time-field">
                  <Label htmlFor="entry-time"><Clock3 size={15} aria-hidden /><span className="sr-only">{t.timeLabel}</span></Label>
                  <Input id="entry-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                </div>
              </div>
            </DrawerHeader>
            <div className="composer-body" data-vaul-no-drag="">
              <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <TabsList className="composer-tabs" aria-label={t.modeAria}>
                  {entryModes.map(({ id, icon: Icon }) => (
                    <TabsTrigger key={id} value={id}><Icon />{t.modes[id]}</TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="wheel"><WheelPicker point={point} onPoint={setPoint} language={language} /></TabsContent>
                <TabsContent value="custom"><ConstellationPicker state={constellation} onChange={setConstellation} language={language} /></TabsContent>
                <TabsContent value="complex">
                  <Button type="button" variant="outline" className="personal-toggle" aria-pressed={personal} onClick={() => setPersonal(!personal)}>
                    {personal ? <ArrowLeft /> : <Plus />} {personal ? t.backToList : t.nameYourOwn}
                  </Button>
                  {personal ? (
                    <div className="personal-fields">
                      <div className="field">
                        <Label htmlFor="emotion-name">{t.emotionName}</Label>
                        <Input id="emotion-name" maxLength={40} value={personalName} onChange={(event) => setPersonalName(event.target.value)} />
                      </div>
                      <div className="field">
                        <Label htmlFor="emotion-color">{t.emotionColor}</Label>
                        <Input id="emotion-color" type="color" value={personalColor} onChange={(event) => setPersonalColor(event.target.value)} />
                      </div>
                      <Intensity emotion={{ ...personalEmotion, name: personalEmotion.name || t.personalFallback }} value={personalValue} onValue={setPersonalValue} language={language} />
                      <Label className="reuse-emotion"><Switch checked={reuse} onCheckedChange={setReuse} /> {t.saveEmotionFuture}</Label>
                    </div>
                  ) : (
                    <>
                      {complex && <Intensity emotion={complex} value={complex.value} fieldsetRef={complexIntensity}
                        onValue={(value) => setComplex(grade(complex, value))} language={language} />}
                      <EmotionChoices options={[...savedEmotions, ...complexEmotions]} selected={complex} language={language} onSelect={(emotion) => {
                        setComplex(grade(emotion, 0))
                        requestAnimationFrame(() => complexIntensity.current?.focus())
                      }} />
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            <CollapsibleContent className="notes-content" data-vaul-no-drag="">
              <Label htmlFor="entry-notes" className="sr-only">{t.notesLabel}</Label>
              <Textarea id="entry-notes" ref={notesInput} placeholder={t.notesPlaceholder} rows={4} maxLength={noteLimit}
                value={notes} onChange={(event) => setNotes(event.target.value)} />
              <p>{notes.length} / {noteLimit}</p>
            </CollapsibleContent>
            <div className="composer-footer">
              {error && <p role="alert">{t.saveError}</p>}
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline"><NotebookPen /> {notesOpen ? t.hideNotes : notes ? t.editNotes : t.addNotes}</Button>
              </CollapsibleTrigger>
              <Button type="submit" disabled={!canSave || saving}><Check /> {saving ? t.saving : t.saveCheckIn}</Button>
            </div>
          </form>
        </Collapsible>
      </DrawerContent>
    </Drawer>
  )
}
