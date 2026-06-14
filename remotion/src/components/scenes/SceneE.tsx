import React from 'react'
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Scene } from '../../types'

export const SceneE: React.FC<{ scene: Scene; palette: { primary: string; accent: string } }> = ({ scene, palette }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const opacity = spring({ frame, fps, config: { damping: 18 } })
  const translateY = (1 - opacity) * 40

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(5,5,8,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: `2px solid ${palette.accent}`,
      padding: '40px 60px',
      opacity, transform: `translateY(${translateY}px)`,
    }}>
      {scene.title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
          {scene.icon && <span style={{ fontSize: 48 }}>{scene.icon}</span>}
          <h2 style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 44, fontWeight: 700,
            color: palette.accent,
          }}>{scene.title}</h2>
        </div>
      )}
      {scene.body && (
        <p style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 36, color: '#fff',
          lineHeight: 1.5,
        }}>{scene.body}</p>
      )}
      {scene.items && scene.items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 16,
          marginTop: 12,
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%',
            background: palette.accent,
            color: '#000', display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Sora, sans-serif',
            fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>{i + 1}</span>
          <span style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 32, color: '#fff',
          }}>{item}</span>
        </div>
      ))}
    </div>
  )
}
