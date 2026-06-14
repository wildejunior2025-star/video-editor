export type SceneType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'BONECO'

export interface LegendaWord {
  word: string
  start: number
  end: number
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export interface LegendaSegment {
  id: number
  text: string
  start: number
  end: number
  words: LegendaWord[]
}

export interface Scene {
  id: string
  type: SceneType
  startLeg: number
  durationLegs: number
  title?: string
  subtitle?: string
  body?: string
  number?: string
  items?: string[]
  color?: string
  imageUrl?: string
  icon?: string
}

export interface Palette {
  primary: string
  secondary: string
  accent: string
}

export interface VideoProps {
  videoSrc: string
  transcription: LegendaSegment[]
  scenes: Scene[]
  palette: Palette
}
