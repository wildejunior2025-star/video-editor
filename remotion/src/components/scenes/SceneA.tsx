import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Scene } from '../../types'

export const SceneA: React.FC<{ scene: Scene; palette: { primary: string; accent: string } }> = ({ scene, palette }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = spring({ frame, fps, config: { damping: 20 } })
  const scale = interpolate(opacity, [0, 1], [0.92, 1])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `linear-gradient(160deg, ${palette.primary}ee, #050508)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity, transform: `scale(${scale})`,
      padding: 80,
    }}>
      {scene.title && (
        <h1 style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 72, fontWeight: 800,
          color: '#fff', textAlign: 'center',
          lineHeight: 1.2,
          textShadow: `0 0 40px ${palette.accent}80`,
        }}>{scene.title}</h1>
      )}
      {scene.subtitle && (
        <p style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 40, fontWeight: 400,
          color: palette.accent, textAlign: 'center',
          marginTop: 32,
        }}>{scene.subtitle}</p>
      )}
    </div>
  )
}
