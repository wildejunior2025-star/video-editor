'use client'
import React from 'react'
import { Scene, LegendaSegment } from '@/types'

interface Props {
  scene: Scene
  index: number
  transcription: LegendaSegment[]
  onEdit: (scene: Scene) => void
  onOffsetChange: (sceneId: string, delta: number) => void
  onDelete: (sceneId: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  A: 'FullScreen', B: 'LowerThird', C: 'Split', D: 'Comparativo',
  E: 'Card', F: 'Mensagem', G: 'Número', H: 'Fluxo', I: 'CTA', BONECO: 'Boneco',
}

export const SceneCard: React.FC<Props> = ({ scene, index, transcription, onEdit, onOffsetChange, onDelete }) => {
  const offset = scene.timeOffset || 0
  const startSeg = transcription[scene.startLeg]
  const actualTime = startSeg ? (startSeg.start + offset).toFixed(1) : '?'

  return (
    <div style={{
      background: 'rgba(14,14,20,0.8)',
      border: '1px solid rgba(255,184,0,0.15)',
      borderRadius: 12,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Tipo */}
      <div
        onClick={() => onEdit(scene)}
        style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #FFB800, #CC9200)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 800,
          color: '#000', cursor: 'pointer',
        }}
      >
        {scene.type}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onEdit(scene)}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, color: '#FFB800', fontWeight: 600 }}>
          Cena {index + 1} — {TYPE_LABELS[scene.type] || scene.type}
        </div>
        <div style={{
          fontFamily: 'Sora, sans-serif', fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {scene.title || scene.body || scene.subtitle || '(sem texto)'}
        </div>
      </div>

      {/* Botão deletar */}
      <button
        onClick={() => { if (confirm('Apagar esta cena?')) onDelete(scene.id) }}
        title="Apagar cena"
        style={{
          width: 26, height: 26, borderRadius: 6, border: 'none',
          background: 'rgba(255,50,50,0.12)', color: '#ff6b6b',
          cursor: 'pointer', fontSize: 14, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >🗑</button>

      {/* Controles de timing */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
          {actualTime}s
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => onOffsetChange(scene.id, -0.5)}
            title="Mover 0.5s para trás"
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: 'rgba(255,100,100,0.15)',
              border: '1px solid rgba(255,100,100,0.3)',
              color: '#ff6b6b', cursor: 'pointer',
              fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >◀</button>
          <button
            onClick={() => onOffsetChange(scene.id, 0.5)}
            title="Mover 0.5s para frente"
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: 'rgba(100,255,100,0.15)',
              border: '1px solid rgba(100,255,100,0.3)',
              color: '#51cf66', cursor: 'pointer',
              fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >▶</button>
        </div>
        {offset !== 0 && (
          <div style={{
            fontFamily: 'Sora, sans-serif', fontSize: 10,
            color: offset > 0 ? '#51cf66' : '#ff6b6b',
          }}>
            {offset > 0 ? '+' : ''}{offset.toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  )
}
