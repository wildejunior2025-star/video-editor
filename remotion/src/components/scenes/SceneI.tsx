import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Scene } from '../../types'

export const SceneI: React.FC<{ scene: Scene; palette: { primary: string; accent: string } }> = ({ scene, palette }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame, fps, config: { damping: 20 } })
  const pulse = Math.sin(frame / 10) * 0.05 + 1

  return (
    <div style={{
      position: 'absolute', bottom: 60, left: 60, right: 60,
      background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
      borderRadius: 32,
      padding: '48px 60px',
      opacity: progress,
      transform: `translateY(${(1 - progress) * 60}px)`,
      boxShadow: `0 20px 60px ${palette.accent}40`,
    }}>
      <h2 style={{
        fontFamily: 'Sora, sans-serif',
        fontSize: 48, fontWeight: 800,
        color: '#000',
        transform: `scale(${pulse})`,
        display: 'inline-block',
        transformOrigin: 'left center',
      }}>{scene.title}</h2>
      {scene.subtitle && (
        <p style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 32, color: 'rgba(0,0,0,0.7)',
          marginTop: 16,
        }}>{scene.subtitle}</p>
      )}
    </div>
  )
}
