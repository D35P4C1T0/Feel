import type { CSSProperties } from 'react'
import {
  Aperture, AudioLines, BadgeCheck, Bird, Blend, BookOpen, CircleHelp, Cloud,
  CloudLightning, CloudRain, Compass, Droplet, Eye, Flame, Flower2, Gem, HandHeart,
  Heart, HeartCrack, Hourglass, Leaf, Moon, Mountain, Palette, PartyPopper, ScanFace,
  ShieldAlert, Shell, Smile, Sparkles, Star, Sun, Telescope, Waves, Wind, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Emotion = { id: string; name: string; color: string }

function emotion(id: string, name: string, color: string, icon: LucideIcon, description = '') {
  return { id, name, color, icon, description }
}

export const coreEmotions = [
  emotion('joy', 'Joy', '#c48927', Sun, 'Pleasure, happiness and positive experience.'),
  emotion('sadness', 'Sadness', '#507fb3', CloudRain, 'Loss, absence and emotional suffering.'),
  emotion('anger', 'Anger', '#c8584a', Flame, 'Opposition, hostility and resistance.'),
  emotion('fear', 'Fear', '#8066ad', ShieldAlert, 'Threat, danger and vulnerability.'),
  emotion('disgust', 'Disgust', '#72854a', Leaf, 'Repulsion, rejection and aversion.'),
  emotion('surprise', 'Surprise', '#bb6b3d', Zap, 'Unexpectedness and sudden change.'),
  emotion('trust', 'Trust', '#427e70', BadgeCheck, 'Confidence in another person or the environment.'),
  emotion('anticipation', 'Anticipation', '#a06a3d', Hourglass, 'Expectation of a future event.'),
  emotion('attachment', 'Attachment', '#ad5874', HandHeart, 'Emotional bonding, affection and connection.'),
  emotion('desire', 'Desire', '#b84e63', Heart, 'Wanting, craving and attraction.'),
  emotion('curiosity', 'Curiosity', '#3e8393', Telescope, 'The impulse to explore and understand.'),
  emotion('calmness', 'Calmness', '#51885e', Waves, 'Peacefulness, relaxation and tranquillity.'),
]

// Adapted from Cowen & Keltner (2017), omitting near-duplicates of the core scale.
export const complexEmotions = [
  emotion('admiration', 'Admiration', '#916580', Star),
  emotion('adoration', 'Adoration', '#a45880', Flower2),
  emotion('aesthetic-appreciation', 'Aesthetic appreciation', '#6e6daf', Palette),
  emotion('amusement', 'Amusement', '#a87926', Smile),
  emotion('anxiety', 'Anxiety', '#795f9b', AudioLines),
  emotion('awe', 'Awe', '#715fa9', Mountain),
  emotion('awkwardness', 'Awkwardness', '#a36466', ScanFace),
  emotion('boredom', 'Boredom', '#80756b', Moon),
  emotion('confusion', 'Confusion', '#6f778a', CircleHelp),
  emotion('craving', 'Craving', '#a75d46', Droplet),
  emotion('empathic-pain', 'Empathic pain', '#965b78', HeartCrack),
  emotion('entrancement', 'Entrancement', '#8671a2', Aperture),
  emotion('excitement', 'Excitement', '#be6345', PartyPopper),
  emotion('horror', 'Horror', '#864858', CloudLightning),
  emotion('interest', 'Interest', '#477e88', Eye),
  emotion('nostalgia', 'Nostalgia', '#947151', BookOpen),
  emotion('relief', 'Relief', '#547e6c', Wind),
  emotion('romance', 'Romance', '#ae567b', Bird),
  emotion('satisfaction', 'Satisfaction', '#82824e', Gem),
  emotion('sexual-desire', 'Sexual desire', '#a3535e', Sparkles),
]

export const neutralEmotion = emotion('neutral', 'Neutral', '#82776f', Cloud)
export const compassEmotions = [coreEmotions[0], coreEmotions[2], coreEmotions[1], coreEmotions[3]]
const icons = new Map([...coreEmotions, ...complexEmotions, neutralEmotion].map(({ id, icon }) => [id, icon]))

export function emotionIcon(id: string) {
  return icons.get(id) ?? (id === 'mixed' ? Blend : Shell)
}

export function emotionStyle(color: string) {
  return { '--emotion': color } as CSSProperties
}

export function emotionValue({ id, name, color }: Emotion): Emotion {
  return { id, name, color }
}

export const entryModes = [
  { id: 'compass', label: 'Compass', icon: Compass },
  { id: 'single', label: 'Single', icon: Heart },
  { id: 'custom', label: 'Custom', icon: Blend },
  { id: 'complex', label: 'Complex', icon: Sparkles },
] as const
