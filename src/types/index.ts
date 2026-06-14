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
  startLeg: number   // índice da legenda onde começa
  durationLegs: number
  timeOffset?: number  // ajuste manual em segundos (+/-)
  fontSize?: number    // tamanho da fonte principal (px)
  textColor?: string   // cor do texto principal
  bgColor?: string     // cor do fundo da cena
  title?: string
  subtitle?: string
  body?: string
  number?: string
  items?: string[]
  color?: string
  imageUrl?: string
  icon?: string
}

export interface VideoAnalysis {
  narrativeFormat: string
  palette: {
    primary: string
    secondary: string
    accent: string
    opacity?: number // 0.1 a 1.0
  }
  scenes: Scene[]
}

export interface ProjectData {
  id: string
  originalVideo: string
  normalizedVideo: string
  transcription: LegendaSegment[]
  analysis: VideoAnalysis
  status: 'uploading' | 'normalizing' | 'transcribing' | 'analyzing' | 'ready' | 'rendering' | 'done' | 'error'
  progress: number
  message: string
  outputVideo?: string
  speed?: number // 1 | 1.25 | 1.5 | 1.75 | 2
  manualCuts?: { id: string; start: number; end: number }[]
  subtitleStyle?: 'reveal' | 'karaoke' | 'classic' // estilo das legendas
}
