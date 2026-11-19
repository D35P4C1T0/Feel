import { createElement } from 'react'
import { emotionIcon, emotionStyle } from '@/lib/emotions'
import type { Emotion } from '@/lib/emotions'

export function EmotionIcon({ emotion }: { emotion: Emotion }) {
  return (
    <span className="emotion-icon" style={emotionStyle(emotion.color)}>
      {createElement(emotionIcon(emotion.id), { 'aria-hidden': true, size: 17 })}
    </span>
  )
}
