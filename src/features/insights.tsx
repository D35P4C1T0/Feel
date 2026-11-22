import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { BarChart3, Grid3X3 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { coreEmotions, complexEmotions, emotionStyle, neutralEmotion } from '@/lib/emotions'
import type { Emotion } from '@/lib/emotions'
import { emotionLabel, getMessages, localeOf } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'
import { dateKey, groupEntries, parseDay, periods, trend, yearDays } from '@/lib/journal'
import type { Grade, Journal, Period } from '@/lib/journal'

export default function Insights({ journal, today, language }: { journal: Journal; today: Date; language: Language }) {
  const t = getMessages(language).insights
  const locale = localeOf(language)
  const dateLabel = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }), [locale])
  const monthLabel = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short' }), [locale])
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
  const progression = trend(journal.entries, period, emotionId, today, journal.settings.weekStartsOn, locale)
  const days = useMemo(() => groupEntries(journal.entries), [journal.entries])
  const dates = useMemo(() => yearDays(year), [year])
  const years = [...new Set([today.getFullYear(), ...journal.entries.map((entry) => Number(entry.day.slice(0, 4)))])].sort((a, b) => b - a)
  const offset = (dates[0].getDay() - journal.settings.weekStartsOn + 7) % 7
  const chartColor = selected?.color ?? 'var(--primary)'
  const cells = dates.map((date, index) => {
    const key = dateKey(date)
    let strongest: Grade | undefined
    for (const entry of days.get(key) ?? []) {
      for (const item of entry.grades) {
        if ((!emotionId || item.id === emotionId) && (!strongest || item.value > strongest.value)) strongest = item
      }
    }
    const dayIndex = index + offset
    return { key, date, day: dayIndex % 7, week: Math.floor(dayIndex / 7), strongest }
  })
  const checked = cells.find(({ key }) => key === inspected)
  const checkLabel = checked?.strongest && `${dateLabel.format(checked.date)} · ${emotionLabel(checked.strongest, language)} ${checked.strongest.value}/10`

  return (
    <>
      <div className="page-heading">
        <h1>{t.title}</h1>
        <div className="inline-field">
          <Label htmlFor="emotion-filter">{t.emotion}</Label>
          <NativeSelect id="emotion-filter" value={emotionId} onChange={(event) => { setEmotionId(event.target.value); setInspected('') }}>
            <NativeSelectOption value="">{t.allEmotions}</NativeSelectOption>
            {[...catalog.values()].map((emotion) => (
              <NativeSelectOption key={emotion.id} value={emotion.id}>{emotionLabel(emotion, language)}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      <Card className="panel insight-panel">
        <div className="insight-panel-head">
          <div>
            <p className="panel-kicker"><BarChart3 /> {t.trends}</p>
            <h2>{t.averageIntensity}</h2>
          </div>
          <div role="group" aria-label={t.timeRangeAria} className="period-control">
            {periods.map(({ id }) => (
              <Button key={id} variant="ghost" aria-pressed={period === id} onClick={() => setPeriod(id)}>{t.periods[id]}</Button>
            ))}
          </div>
        </div>
        {progression.some(({ value }) => value !== null) ? (
          <ChartContainer className="mood-chart" config={{ value: { label: t.averageIntensity, color: chartColor } }}>
            <BarChart accessibilityLayer data={progression} margin={{ left: -24, right: 4, top: 8 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} interval={period === 'month' ? 4 : 'preserveStartEnd'} />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} />
              <ChartTooltip content={
                <ChartTooltipContent hideLabel={false} labelFormatter={(_, payload) => {
                  const day = payload[0]?.payload.day as string | undefined
                  return day ? day.length === 7 ? parseDay(`${day}-01`).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : dateLabel.format(parseDay(day)) : ''
                }} />
              } />
              <Bar dataKey="value" fill="var(--color-value)" radius={[5, 5, 0, 0]} maxBarSize={44} minPointSize={2} />
            </BarChart>
          </ChartContainer>
        ) : <p className="insight-empty">{t.noGrades}</p>}
      </Card>
      <Card className="panel insight-panel" style={emotionStyle(chartColor)}>
        <div className="insight-panel-head">
          <div>
            <p className="panel-kicker"><Grid3X3 /> {t.moodMosaic}</p>
            <h2>{t.yearInColor}</h2>
          </div>
          <NativeSelect aria-label={t.mosaicYearAria} value={year} onChange={(event) => { setYear(Number(event.target.value)); setInspected('') }}>
            {years.map((value) => <NativeSelectOption key={value}>{value}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="mosaic-scroll" role="region" tabIndex={0} aria-label={t.mosaicRegionAria(year)}>
          <div className="mosaic-layout">
            {cells.filter(({ date }) => date.getDate() === 1).map(({ key, week, date }) => (
              <span aria-hidden className="mosaic-month" key={key} style={{ '--week': week } as CSSProperties}>{monthLabel.format(date)}</span>
            ))}
            {cells.map(({ key, date, day, week, strongest }) => {
              const slot = { '--day': day, '--week': week } as CSSProperties
              if (!strongest) return <span aria-hidden className="mosaic-tile" key={key} style={slot} title={dateLabel.format(date)} />
              const label = `${dateLabel.format(date)}: ${emotionLabel(strongest, language)} ${strongest.value}/10`
              return <Button key={key} variant="ghost" className="mosaic-tile mosaic-filled"
                aria-label={label} aria-pressed={inspected === key} title={label} onClick={() => setInspected(key)}
                style={{ ...slot, backgroundColor: `color-mix(in srgb, ${strongest.color} ${20 + 8 * strongest.value}%, var(--muted))` }} />
            })}
          </div>
        </div>
        <div className="mosaic-footer">
          <p aria-live="polite">{checkLabel || t.mosaicHint}</p>
          <span className="mosaic-legend">{t.low} <i /><i /><i /><i /> {t.high}</span>
        </div>
      </Card>
    </>
  )
}
