import React from 'react'
import { useCurrentFrame } from 'remotion'
import { LegendaSegment } from '../types'
import { segToFrame } from '../utils'

interface Props {
  transcription: LegendaSegment[]
  accentColor: string
}

export const Legendas: React.FC<Props> = ({ transcription, accentColor }) => {
  const frame = useCurrentFrame()
  const currentTime = frame / 30

  const currentSeg = transcription.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  )

  if (!currentSeg) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 280,
        left: 0,
        right: 0,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 8px',
        padding: '0 60px',
      }}
    >
      {currentSeg.words.map((w, i) => {
        const isActive = currentTime >= w.start && currentTime <= w.end
        const isPast = currentTime > w.end
        const color =
          w.sentiment === 'positive'
            ? '#00E676'
            : w.sentiment === 'negative'
            ? '#FF1744'
            : '#FFFFFF'

        return (
          <span
            key={i}
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 52,
              fontWeight: 800,
              color: isActive ? accentColor : isPast ? 'rgba(255,255,255,0.5)' : color,
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
              transform: isActive ? 'scale(1.08)' : 'scale(1)',
              display: 'inline-block',
              transition: 'all 0.1s',
              WebkitTextStroke: isActive ? '1px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {w.word}
          </span>
        )
      })}
    </div>
  )
}
