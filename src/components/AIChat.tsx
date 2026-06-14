'use client'
import React, { useState, useRef, useEffect } from 'react'
import { VideoAnalysis, LegendaSegment } from '@/types'

interface Message {
  role: 'user' | 'ai'
  text: string
}

interface Props {
  analysis: VideoAnalysis
  transcription: LegendaSegment[]
  onUpdate: (analysis: VideoAnalysis) => void
}

const SUGGESTIONS = [
  'Adicione mais cenas no vídeo',
  'Mude a paleta de cores para azul',
  'Coloque um comparativo no meio',
  'Adicione um CTA no final',
  'Reduza para 4 cenas principais',
  'Deixe as cenas mais curtas',
]

export const AIChat: React.FC<Props> = ({ analysis, transcription, onUpdate }) => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Olá! Me diz o que quer ajustar no vídeo. Posso adicionar cenas, mudar cores, reorganizar tudo. 🎬' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: userMsg, analysis, transcription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      onUpdate(data.analysis)
      setMessages(prev => [...prev, {
        role: 'ai',
        text: '✅ Feito! As cenas foram atualizadas. Dê play para ver as mudanças.',
      }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessages(prev => [...prev, { role: 'ai', text: `❌ Erro: ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? '#333' : 'linear-gradient(135deg, #FFB800, #CC9200)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
          boxShadow: '0 4px 20px rgba(255,184,0,0.4)',
          transition: 'all 0.2s',
        }}
        title="Editar com IA"
      >
        {open ? '✕' : '✨'}
      </button>

      {/* Painel de chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 999,
          width: 340, height: 500,
          background: '#0e0e14',
          border: '1px solid rgba(255,184,0,0.2)',
          borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,184,0,0.1)',
            background: 'rgba(255,184,0,0.05)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, color: '#FFB800' }}>
                Editor IA
              </div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                Diga o que quer mudar
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #FFB800, #CC9200)'
                    : 'rgba(255,255,255,0.06)',
                  color: msg.role === 'user' ? '#000' : '#fff',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  fontFamily: 'Sora,sans-serif',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.06)', borderRadius: '16px 16px 16px 4px',
                  padding: '10px 16px', fontFamily: 'Sora,sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)',
                }}>
                  ⏳ Editando...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões rápidas */}
          <div style={{
            padding: '6px 10px',
            display: 'flex', gap: 6, overflowX: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                disabled={loading}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255,184,0,0.08)',
                  border: '1px solid rgba(255,184,0,0.2)',
                  borderRadius: 20, padding: '4px 10px',
                  fontFamily: 'Sora,sans-serif', fontSize: 11,
                  color: '#FFB800', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,184,0,0.1)',
            display: 'flex', gap: 8,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ex: adicione um comparativo no segundo 20..."
              disabled={loading}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,184,0,0.2)',
                borderRadius: 10, padding: '8px 12px',
                fontFamily: 'Sora,sans-serif', fontSize: 13,
                color: '#fff', outline: 'none',
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: input.trim() && !loading ? 'linear-gradient(135deg, #FFB800, #CC9200)' : 'rgba(255,255,255,0.05)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
