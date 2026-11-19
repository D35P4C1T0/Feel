import { useRef, useState } from 'react'
import type { FormEvent, Ref } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, NotebookPen, Plus, X } from 'lucide-react'
import { ColorArea, parseColor } from 'react-aria-components/ColorArea'
import { ColorThumb } from 'react-aria-components/ColorThumb'
import { EmotionIcon } from '@/components/emotion-icon'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { compassEmotions, complexEmotions, coreEmotions, emotionStyle, entryModes } from '@/lib/emotions'
import type { Emotion } from '@/lib/emotions'
import { compassGrades, grade, localTime, noteLimit, parseDay, validGrades } from '@/lib/journal'
import type { Entry, Grade } from '@/lib/journal'

type Mode = typeof entryModes[number]['id']
type Point = NonNullable<Entry['point']>
const center: Point = { x: 0, y: 0 }

function CompassPicker({ point, onPoint }: { point: Point | null; onPoint: (point: Point) => void }) {
  const { x, y } = point ?? center
  const grades = point ? compassGrades(point) : []
  return (
    <div>
      <ColorArea
        className="mood-compass"
        colorSpace="hsb"
        xChannel="saturation"
        yChannel="brightness"
        aria-label="Mood compass. Joy upper left, anger upper right, sadness lower left, fear lower right."
        value={parseColor(`hsb(0, ${(x + 1) * 50}%, ${(1 - y) * 50}%)`)}
        onChange={(color) => onPoint({
          x: color.getChannelValue('saturation') / 50 - 1,
          y: 1 - color.getChannelValue('brightness') / 50,
        })}
        onChangeEnd={(color) => onPoint({
          x: color.getChannelValue('saturation') / 50 - 1,
          y: 1 - color.getChannelValue('brightness') / 50,
        })}
        data-vaul-no-drag=""
      >
        {compassEmotions.map((emotion) => (
          <span className={`compass-label compass-${emotion.id}`} key={emotion.id}>
            <emotion.icon size={17} /> {emotion.name}
          </span>
        ))}
        <ColorThumb className="compass-thumb" data-picked={Boolean(point)} />
      </ColorArea>
      <div className="compass-result" data-neutral={!point || grades[0]?.id === 'neutral'}>
        <p aria-live="polite">
          {point ? grades.map((item) => item.id === 'neutral' ? item.name : `${item.name}\u00a0${item.value}/10`).join(' · ')
            : 'Tap or drag to place your mood.'}
        </p>
        <Button type="button" variant="ghost" onClick={() => onPoint(center)}>Center</Button>
      </div>
    </div>
  )
}

function EmotionChoices({ options, selected, onSelect }: {
  options: Emotion[]
  selected: Emotion | null
  onSelect: (emotion: Emotion) => void
}) {
  return (
    <div className="emotion-choices">
      {options.map((emotion) => (
        <Button key={emotion.id} type="button" variant="outline" className="emotion-choice"
          aria-pressed={selected?.id === emotion.id} onClick={() => onSelect(emotion)}>
          <EmotionIcon emotion={emotion} />
          <span>{emotion.name}</span>
        </Button>
      ))}
    </div>
  )
}

function Intensity({ emotion, value, onValue, fieldsetRef }: {
  emotion: Emotion
  value?: number
  onValue: (value: number, fromKeyboard: boolean) => void
  fieldsetRef?: Ref<HTMLFieldSetElement>
}) {
  return (
    <fieldset ref={fieldsetRef} tabIndex={fieldsetRef ? -1 : undefined} className="intensity" style={emotionStyle(emotion.color)}>
      <legend>{emotion.name} intensity</legend>
      <div className="intensity-values">
        {Array.from({ length: 10 }, (_, i) => (
          <Button key={i} type="button" variant="outline" aria-pressed={value === i + 1}
            onClick={(event) => onValue(i + 1, event.detail === 0)}>{i + 1}</Button>
        ))}
      </div>
      <div className="intensity-labels"><span>Subtle</span><span>Intense</span></div>
    </fieldset>
  )
}

export default function Composer({ day, open, onOpenChange, onCloseFocus, savedEmotions, onSave }: {
  day: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseFocus: () => void
  savedEmotions: Emotion[]
  onSave: (entry: Entry, emotion?: Emotion) => Promise<boolean>
}) {
  const [mode, setMode] = useState<Mode>('compass')
  const [point, setPoint] = useState<Point | null>(null)
  const [single, setSingle] = useState<Grade | null>(null)
  const [complex, setComplex] = useState<Grade | null>(null)
  const complexIntensity = useRef<HTMLFieldSetElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [custom, setCustom] = useState<Record<string, Grade>>({})
  const [step, setStep] = useState(0)
  const [outgoingStep, setOutgoingStep] = useState<number>()
  const activeStep = useRef<HTMLDivElement>(null)
  const [personal, setPersonal] = useState(false)
  const [personalName, setPersonalName] = useState('')
  const [personalColor, setPersonalColor] = useState('#9671a9')
  const [personalValue, setPersonalValue] = useState(0)
  const [reuse, setReuse] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const notesInput = useRef<HTMLTextAreaElement>(null)
  const [notes, setNotes] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const current = coreEmotions[step]
  const personalEmotion = { id: 'personal', name: personalName.trim(), color: personalColor }
  const grades = {
    compass: point ? compassGrades(point) : [],
    single: single?.value ? [single] : [],
    custom: Object.values(custom),
    complex: personal
      ? personalEmotion.name && personalValue ? [grade(personalEmotion, personalValue)] : []
      : complex?.value ? [complex] : [],
  }[mode]
  const canSave = validGrades(grades)

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
      day,
      time: time || localTime(new Date()),
      grades: keptGrades,
      note: notes.trim(),
      ...(mode === 'compass' && point ? { point } : {}),
    }
    if (await onSave(entry, reuse ? customEmotion : undefined)) onOpenChange(false)
    else setError(true)
    setSaving(false)
  }

  function moveStep(next: number, focusStep = false) {
    setOutgoingStep(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? undefined : step)
    setStep(next)
    if (focusStep || next === 0 || next === coreEmotions.length) {
      requestAnimationFrame(() => activeStep.current?.focus())
    }
  }

  function skip() {
    if (current && custom[current.id]) {
      const next = { ...custom }
      delete next[current.id]
      setCustom(next)
    }
    moveStep(step + 1)
  }

  function renderCustomStep(index: number) {
    const emotion = coreEmotions[index]
    if (!emotion) {
      return <p className="custom-summary">{grades.length ? `${grades.length} graded ${grades.length === 1 ? 'emotion' : 'emotions'}` : 'Choose at least one grade to save.'}</p>
    }
    return (
      <>
        <div className="step-heading">
          <EmotionIcon emotion={emotion} />
          <div><strong>{emotion.name}</strong><p>{emotion.description}</p></div>
          <span className="step-count" role="status"><span className="sr-only">Step </span>{index + 1} / {coreEmotions.length}</span>
        </div>
        <Intensity emotion={emotion} value={custom[emotion.id]?.value} onValue={(value, fromKeyboard) => {
          setCustom({ ...custom, [emotion.id]: grade(emotion, value) })
          moveStep(index + 1, fromKeyboard)
        }} />
      </>
    )
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
              <div>
                <DrawerTitle>Today I feel</DrawerTitle>
                <DrawerDescription>{parseDay(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</DrawerDescription>
              </div>
              <div className="time-field" data-vaul-no-drag="">
                <Label htmlFor="entry-time"><Clock3 size={15} aria-hidden /><span>Time</span></Label>
                <Input id="entry-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </div>
              <DrawerClose asChild><Button ref={closeButton} variant="ghost" size="icon-lg" aria-label="Close check-in" disabled={saving}><X /></Button></DrawerClose>
            </DrawerHeader>
            <div className="composer-body" data-vaul-no-drag="">
              <Tabs value={mode} onValueChange={(value) => { setMode(value as Mode); setOutgoingStep(undefined) }}>
                <TabsList className="composer-tabs" aria-label="Mood entry method">
                  {entryModes.map(({ id, label, icon: Icon }) => (
                    <TabsTrigger key={id} value={id}><Icon />{label}</TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="compass"><CompassPicker point={point} onPoint={setPoint} /></TabsContent>
                <TabsContent value="single">
                  <EmotionChoices options={coreEmotions} selected={single} onSelect={(emotion) => setSingle(grade(emotion, 0))} />
                  {single && <Intensity emotion={single} value={single.value} onValue={(value) => setSingle(grade(single, value))} />}
                </TabsContent>
                <TabsContent value="custom">
                  <div className="custom-steps" data-direction={outgoingStep === undefined ? undefined : step > outgoingStep ? 'forward' : 'back'}>
                    {outgoingStep !== undefined && (
                      <div key={`outgoing-${outgoingStep}`} className="custom-step-exit" inert
                        onAnimationEnd={() => setOutgoingStep((previous) => previous === outgoingStep ? undefined : previous)}>
                        {renderCustomStep(outgoingStep)}
                      </div>
                    )}
                    <div key={step} className="custom-step-current" ref={activeStep} tabIndex={-1}>
                      {renderCustomStep(step)}
                    </div>
                  </div>
                  <div className="step-actions">
                    <Button type="button" variant="ghost" disabled={!step} onClick={() => moveStep(step - 1)}><ArrowLeft /> Back</Button>
                    {current && <Button type="button" variant="ghost" onClick={skip}>Skip <ArrowRight /></Button>}
                  </div>
                </TabsContent>
                <TabsContent value="complex">
                  <Button type="button" variant="outline" className="personal-toggle" aria-pressed={personal} onClick={() => setPersonal(!personal)}>
                    {personal ? <ArrowLeft /> : <Plus />} {personal ? 'Back to emotion list' : 'Name your own emotion'}
                  </Button>
                  {personal ? (
                    <div className="personal-fields">
                      <div className="field">
                        <Label htmlFor="emotion-name">Emotion name</Label>
                        <Input id="emotion-name" maxLength={40} value={personalName} onChange={(event) => setPersonalName(event.target.value)} />
                      </div>
                      <div className="field">
                        <Label htmlFor="emotion-color">Emotion color</Label>
                        <Input id="emotion-color" type="color" value={personalColor} onChange={(event) => setPersonalColor(event.target.value)} />
                      </div>
                      <Intensity emotion={{ ...personalEmotion, name: personalEmotion.name || 'Personal emotion' }} value={personalValue} onValue={setPersonalValue} />
                      <Label className="reuse-emotion"><Switch checked={reuse} onCheckedChange={setReuse} /> Save this emotion for future check-ins</Label>
                    </div>
                  ) : (
                    <>
                      {complex && <Intensity emotion={complex} value={complex.value} fieldsetRef={complexIntensity}
                        onValue={(value) => setComplex(grade(complex, value))} />}
                      <EmotionChoices options={[...savedEmotions, ...complexEmotions]} selected={complex} onSelect={(emotion) => {
                        setComplex(grade(emotion, 0))
                        requestAnimationFrame(() => complexIntensity.current?.focus())
                      }} />
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            <CollapsibleContent className="notes-content" data-vaul-no-drag="">
              <Label htmlFor="entry-notes" className="sr-only">Notes</Label>
              <Textarea id="entry-notes" ref={notesInput} placeholder="What was happening?" rows={4} maxLength={noteLimit}
                value={notes} onChange={(event) => setNotes(event.target.value)} />
              <p>{notes.length} / {noteLimit}</p>
            </CollapsibleContent>
            <div className="composer-footer">
              {error && <p role="alert">Couldn’t save this check-in. Try again.</p>}
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline"><NotebookPen /> {notesOpen ? 'Hide notes' : notes ? 'Edit notes' : 'Add notes'}</Button>
              </CollapsibleTrigger>
              <Button type="submit" disabled={!canSave || saving}><Check /> {saving ? 'Saving…' : 'Save check-in'}</Button>
            </div>
          </form>
        </Collapsible>
      </DrawerContent>
    </Drawer>
  )
}
