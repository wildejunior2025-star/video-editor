'use client'
import React, { useRef, useState } from 'react'

export interface Cut {
  id: string
  start: number
  end: number
}

interface Props {
  videoSrc: string
  cuts: Cut[]
  onCutsChange: (cuts: Cut[]) => void
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s.toFixed(1).replace('.', ':').padStart(2, '0')
  return `${m}:${String(Math.floor(s % 60)).padStart(2,'0')}.${(s % 1).toFixed(1).slice(2)}`
}

export const ManualCuts: React.FC<Props> = ({ videoSrc, cuts, onCutsChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [markStart, setMarkStart] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [open, setOpen] = useState(false)

  const getCurrentTime = () => videoRef.current?.currentTime || 0

  const handleMarkStart = () => setMarkStart(getCurrentTime())

  const handleMarkEnd = () => {
    const end = getCurrentTime()
    if (markStart === null) return
    if (end <= markStart) { alert('O fim precisa ser depois do início'); return }
    const newCut: Cut = { id: Date.now().toString(), start: markStart, end }
    onCutsChange([...cuts, newCut])
    setMarkStart(null)
  }

  const removeCut = (id: string) => onCutsChange(cuts.filter(c => c.id !== id))

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 16px',
          background: open ? 'rgba(255,100,100,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(255,100,100,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 600, color: open ? '#ff8a8a' : 'rgba(255,255,255,0.6)' }}>
          ✂️ Cortes manuais {cuts.length > 0 ? `(${cuts.length})` : ''}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          border: '1px solid rgba(255,100,100,0.2)', borderTop: 'none',
          borderRadius: '0 0 10px 10px', padding: '16px',
          background: 'rgba(14,14,20,0.8)',
        }}>
          {/* Player mini */}
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            style={{ width: '100%', borderRadius: 8, background: '#000', marginBottom: 12 }}
          />

          {/* Tempo atual */}
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 10 }}>
            Posição atual: <span style={{ color: '#FFB800', fontWeight: 700 }}>{formatTime(currentTime)}</span>
            {markStart !== null && (
              <span style={{ marginLeft: 12, color: '#ff8a8a' }}>
                Início marcado: {formatTime(markStart)}
              </span>
            )}
          </div>

          {/* Botões marcar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={handleMarkStart}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: markStart !== null ? 'rgba(255,184,0,0.2)' : 'rgba(255,255,255,0.08)',
                fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 600,
                color: markStart !== null ? '#FFB800' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
              }}
            >
              {markStart !== null ? `✓ Início: ${formatTime(markStart)}` : '⏮ Marcar Início'}
            </button>
            <button
              onClick={handleMarkEnd}
              disabled={markStart === null}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: markStart !== null ? 'rgba(255,80,80,0.2)' : 'rgba(255,255,255,0.04)',
                fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 600,
                color: markStart !== null ? '#ff8a8a' : 'rgba(255,255,255,0.2)',
                cursor: markStart !== null ? 'pointer' : 'not-allowed',
              }}
            >
              ⏭ Marcar Fim e Cortar
            </button>
          </div>

          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 12 }}>
            Dê play, pause no ponto de início → clique "Marcar Início"<br/>
            Depois pause no ponto de fim → clique "Marcar Fim e Cortar"
          </div>

          {/* Lista de cortes */}
          {cuts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                Segmentos que serão REMOVIDOS:
              </div>
              {cuts.map((cut, i) => (
                <div key={cut.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)',
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Corte {i + 1}: </span>
                    <span style={{ color: '#ff8a8a', fontWeight: 600 }}>{formatTime(cut.start)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}> → </span>
                    <span style={{ color: '#ff8a8a', fontWeight: 600 }}>{formatTime(cut.end)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                      ({(cut.end - cut.start).toFixed(1)}s)
                    </span>
                  </div>
                  <button
                    onClick={() => removeCut(cut.id)}
                    style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
