import { useState } from 'react'
import type { FormEvent } from 'react'
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
      <div className="compass-result">
        <p aria-live="polite">
          {point ? compassGrades(point).map((item) => item.name === 'Neutral' ? item.name : `${item.name} ${item.value}/10`).join(' · ')
            : 'Tap or drag to place your mood.'}
        </p>
        <Button type="button" variant="ghost" onClick={() => onPoint(center)}>Neutral</Button>
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

function Intensity({ emotion, value, onValue }: { emotion: Emotion; value?: number; onValue: (value: number) => void }) {
  return (
    <fieldset className="intensity" style={emotionStyle(emotion.color)}>
      <legend>{emotion.name} intensity</legend>
      <div className="intensity-values">
        {Array.from({ length: 10 }, (_, i) => (
          <Button key={i} type="button" variant="outline" aria-pressed={value === i + 1}
            onClick={() => onValue(i + 1)}>{i + 1}</Button>
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
  const [custom, setCustom] = useState<Record<string, Grade>>({})
  const [step, setStep] = useState(0)
  const [personal, setPersonal] = useState(false)
  const [personalName, setPersonalName] = useState('')
  const [personalColor, setPersonalColor] = useState('#9671a9')
  const [personalValue, setPersonalValue] = useState(0)
  const [reuse, setReuse] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
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

  function skip() {
    if (current && custom[current.id]) {
      const next = { ...custom }
      delete next[current.id]
      setCustom(next)
    }
    setStep(step + 1)
  }

  return (
    <Drawer open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }} autoFocus>
      <DrawerContent className="composer" data-notes={notesOpen} onCloseAutoFocus={(event) => { event.preventDefault(); onCloseFocus() }}>
        <DrawerHeader className="composer-header">
          <div>
            <DrawerTitle>How are you feeling?</DrawerTitle>
            <DrawerDescription>{parseDay(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</DrawerDescription>
          </div>
          <DrawerClose asChild><Button variant="ghost" size="icon-lg" aria-label="Close check-in" disabled={saving}><X /></Button></DrawerClose>
        </DrawerHeader>
        <form className="composer-form" onSubmit={submit}>
          <div className="composer-body" data-vaul-no-drag="">
            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
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
                {current ? (
                  <>
                    <div className="step-heading">
                      <EmotionIcon emotion={current} />
                      <div><strong>{current.name}</strong><p>{current.description}</p></div>
                      <span className="step-count">{step + 1} / {coreEmotions.length}</span>
                    </div>
                    <progress className="step-progress" aria-label="Custom assessment progress" value={step + 1} max={coreEmotions.length} />
                    <Intensity emotion={current} value={custom[current.id]?.value} onValue={(value) => {
                      setCustom({ ...custom, [current.id]: grade(current, value) })
                      setStep(step + 1)
                    }} />
                  </>
                ) : <p className="custom-summary">{grades.length ? `${grades.length} graded ${grades.length === 1 ? 'emotion' : 'emotions'}` : 'Choose at least one grade to save.'}</p>}
                <div className="step-actions">
                  <Button type="button" variant="ghost" disabled={!step} onClick={() => setStep(step - 1)}><ArrowLeft /> Back</Button>
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
                    {complex && <Intensity emotion={complex} value={complex.value} onValue={(value) => setComplex(grade(complex, value))} />}
                    <div className="complex-options">
                      <EmotionChoices options={[...savedEmotions, ...complexEmotions]} selected={complex} onSelect={(emotion) => setComplex(grade(emotion, 0))} />
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
            <div className="entry-extras">
              <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost"><NotebookPen /> {notesOpen ? 'Hide notes' : notes ? 'Edit notes' : 'Add notes'}</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="notes-content">
                  <Label htmlFor="entry-notes" className="sr-only">Notes</Label>
                  <Textarea id="entry-notes" placeholder="What was happening?" rows={4} maxLength={noteLimit}
                    value={notes} onChange={(event) => setNotes(event.target.value)} />
                  <p>{notes.length} / {noteLimit}</p>
                </CollapsibleContent>
              </Collapsible>
              <div className="time-field">
                <Label htmlFor="entry-time"><Clock3 size={15} /> Time</Label>
                <Input id="entry-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </div>
            </div>
          </div>
          <div className="composer-footer">
            {error && <p role="alert">Couldn’t save this check-in. Try again.</p>}
            <Button type="submit" disabled={!canSave || saving}><Check /> {saving ? 'Saving…' : 'Save check-in'}</Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
