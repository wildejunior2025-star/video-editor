import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Scene } from '../../types'

export const SceneG: React.FC<{ scene: Scene; palette: { primary: string; accent: string } }> = ({ scene, palette }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 80 } })
  const scale = interpolate(progress, [0, 1], [0.5, 1])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,5,8,0.85)',
    }}>
      <div style={{
        fontSize: 180, fontWeight: 800,
        fontFamily: 'Sora, sans-serif',
        color: palette.accent,
        transform: `scale(${scale})`,
        textShadow: `0 0 60px ${palette.accent}60`,
        lineHeight: 1,
      }}>{scene.number || scene.title}</div>
      {scene.subtitle && (
        <p style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 44, color: '#fff',
          marginTop: 24, opacity: progress,
          textAlign: 'center', padding: '0 60px',
        }}>{scene.subtitle}</p>
      )}
    </div>
  )
}
