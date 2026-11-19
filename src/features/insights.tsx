import { useMemo, useState } from 'react'
import { BarChart3, Grid3X3 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { coreEmotions, complexEmotions, emotionStyle, neutralEmotion } from '@/lib/emotions'
import type { Emotion } from '@/lib/emotions'
import { dateKey, groupEntries, parseDay, periods, trend, yearDays } from '@/lib/journal'
import type { Grade, Journal, Period } from '@/lib/journal'

const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'short' })

export default function Insights({ journal, today }: { journal: Journal; today: Date }) {
  const [period, setPeriod] = useState<Period>('week')
  const [emotionId, setEmotionId] = useState('')
  const [year, setYear] = useState(today.getFullYear())
  const [inspected, setInspected] = useState('')

  const catalog = useMemo(() => {
    const byId = new Map<string, Emotion>(
      [...coreEmotions, ...complexEmotions, neutralEmotion, ...journal.emotions].map((emotion) => [emotion.id, emotion]),
    )
    for (const entry of journal.entries) for (const item of entry.grades) byId.set(item.id, item)
    return byId
  }, [journal])
  const selected = catalog.get(emotionId)
  const progression = trend(journal.entries, period, emotionId, today, journal.settings.weekStartsOn)
  const days = useMemo(() => groupEntries(journal.entries), [journal.entries])
  const dates = useMemo(() => yearDays(year), [year])
  const years = [...new Set([today.getFullYear(), ...journal.entries.map((entry) => Number(entry.day.slice(0, 4)))])].sort((a, b) => b - a)
  const offset = (dates[0].getDay() - journal.settings.weekStartsOn + 7) % 7
  const columns = Math.ceil((offset + dates.length) / 7)
  const chartColor = selected?.color ?? 'var(--primary)'
  const cells = dates.map((date, index) => {
    const key = dateKey(date)
    let strongest: Grade | undefined
    for (const entry of days.get(key) ?? []) {
      for (const item of entry.grades) {
        if ((!emotionId || item.id === emotionId) && (!strongest || item.value > strongest.value)) strongest = item
      }
    }
    return { key, date, column: 1 + Math.floor((index + offset) / 7), row: 1 + (index + offset) % 7, strongest }
  })
  const checked = cells.find(({ key }) => key === inspected)
  const checkLabel = checked?.strongest && `${dateLabel.format(checked.date)} · ${checked.strongest.name} ${checked.strongest.value}/10`

  return (
    <>
      <div className="page-heading">
        <h1>Insights</h1>
        <div className="inline-field">
          <Label htmlFor="emotion-filter">Emotion</Label>
          <NativeSelect id="emotion-filter" value={emotionId} onChange={(event) => { setEmotionId(event.target.value); setInspected('') }}>
            <NativeSelectOption value="">All emotions</NativeSelectOption>
            {[...catalog.values()].map(({ id, name }) => <NativeSelectOption key={id} value={id}>{name}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </div>
      <Card className="panel insight-panel trends-panel">
        <div className="insight-panel-head">
          <div>
            <p className="panel-kicker"><BarChart3 /> Trends</p>
            <h2>Average intensity</h2>
          </div>
          <div role="group" aria-label="Time range" className="period-control">
            {periods.map(({ id, label }) => (
              <Button key={id} variant="ghost" aria-pressed={period === id} onClick={() => setPeriod(id)}>{label}</Button>
            ))}
          </div>
        </div>
        {progression.some(({ value }) => value !== null) ? (
          <ChartContainer className="mood-chart" config={{ value: { label: 'Average intensity', color: chartColor } }}>
            <BarChart accessibilityLayer data={progression} margin={{ left: -24, right: 4, top: 8 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} interval={period === 'month' ? 4 : 'preserveStartEnd'} />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} />
              <ChartTooltip content={
                <ChartTooltipContent hideLabel={false} labelFormatter={(_, payload) => {
                  const day = payload[0]?.payload.day as string | undefined
                  return day ? day.length === 7 ? parseDay(`${day}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : dateLabel.format(parseDay(day)) : ''
                }} />
              } />
              <Bar dataKey="value" fill="var(--color-value)" radius={[5, 5, 0, 0]} maxBarSize={44} minPointSize={2} />
            </BarChart>
          </ChartContainer>
        ) : <p className="insight-empty">No grades in this time range.</p>}
      </Card>
      <Card className="panel insight-panel" style={emotionStyle(chartColor)}>
        <div className="insight-panel-head">
          <div>
            <p className="panel-kicker"><Grid3X3 /> Mood mosaic</p>
            <h2>A year in color</h2>
          </div>
          <NativeSelect aria-label="Mosaic year" value={year} onChange={(event) => { setYear(Number(event.target.value)); setInspected('') }}>
            {years.map((value) => <NativeSelectOption key={value}>{value}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="mosaic-scroll" role="region" tabIndex={0} aria-label={`${year} daily mood mosaic`}>
          <div className="mosaic-layout" style={{ gridTemplateColumns: `repeat(${columns}, minmax(10px, 1fr))` }}>
            {cells.filter(({ date }) => date.getDate() === 1).map(({ key, column, date }) => (
              <span aria-hidden className="mosaic-month" key={key} style={{ gridColumnStart: column, gridRowStart: 1 }}>{monthLabel.format(date)}</span>
            ))}
            {cells.map(({ key, date, column, row, strongest }) => {
              const slot = { gridColumnStart: column, gridRowStart: row + 1 }
              if (!strongest) return <span aria-hidden className="mosaic-tile" key={key} style={slot} title={dateLabel.format(date)} />
              const label = `${dateLabel.format(date)}: ${strongest.name} ${strongest.value}/10`
              return <Button key={key} variant="ghost" className="mosaic-tile mosaic-filled"
                aria-label={label} aria-pressed={inspected === key} title={label} onClick={() => setInspected(key)}
                style={{ ...slot, backgroundColor: `color-mix(in srgb, ${strongest.color} ${20 + 8 * strongest.value}%, var(--muted))` }} />
            })}
          </div>
        </div>
        <div className="mosaic-footer">
          <p aria-live="polite">{checkLabel || 'Each tile shows the day’s highest recorded grade.'}</p>
          <span className="mosaic-legend">Low <i /><i /><i /><i /> High</span>
        </div>
      </Card>
    </>
  )
}
