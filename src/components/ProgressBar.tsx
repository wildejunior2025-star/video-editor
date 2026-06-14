'use client'
import React, { useEffect, useState, useRef } from 'react'

interface Props {
  progress: number
  message: string
  status: string
  estimatedSeconds?: number
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const ProgressBar: React.FC<Props> = ({ progress, message, status, estimatedSeconds = 0 }) => {
  const isError = status === 'error'
  const isDone = progress >= 100
  const [displayed, setDisplayed] = useState(progress)
  const [countdown, setCountdown] = useState(estimatedSeconds)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const startedRef = useRef(false)

  // Inicia contagem regressiva quando o progresso começa
  useEffect(() => {
    if (estimatedSeconds > 0 && progress > 0 && progress < 100 && !isError && !startedRef.current) {
      startedRef.current = true
      setCountdown(estimatedSeconds)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    if (isDone || isError) {
      if (countdownRef.current) clearInterval(countdownRef.current)
      startedRef.current = false
      setCountdown(0)
    }
    return () => {
      if (isDone || isError) clearInterval(countdownRef.current!)
    }
  }, [estimatedSeconds, progress, isError, isDone])

  // Anima barra suavemente
  useEffect(() => {
    if (isError) { setDisplayed(progress); return }
    if (displayed === progress) return
    const step = displayed < progress ? 0.4 : -0.4
    const interval = setInterval(() => {
      setDisplayed(prev => {
        const next = prev + step
        if ((step > 0 && next >= progress) || (step < 0 && next <= progress)) {
          clearInterval(interval)
          return progress
        }
        return Math.round(next * 10) / 10
      })
    }, 16)
    return () => clearInterval(interval)
  }, [progress, isError])

  const steps = [
    { label: 'Upload', at: 10 },
    { label: 'Áudio', at: 35 },
    { label: 'Cortes', at: 60 },
    { label: 'IA', at: 75 },
    { label: 'Pronto', at: 100 },
  ]

  return (
    <div style={{
      background: 'rgba(14,14,20,0.8)',
      border: `1px solid ${isError ? '#FF1744' : 'rgba(255,184,0,0.2)'}`,
      borderRadius: 16,
      padding: '20px 24px',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Linha superior: mensagem + contagem */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600,
          color: isError ? '#FF1744' : '#FFB800', flex: 1,
        }}>
          {message}
        </span>

        {/* Bloco direito: porcentagem + contagem */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {countdown > 0 && !isError && !isDone && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'rgba(255,184,0,0.1)', borderRadius: 10,
              padding: '6px 12px', border: '1px solid rgba(255,184,0,0.2)',
            }}>
              <span style={{
                fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800,
                color: '#FFB800', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatCountdown(countdown)}
              </span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 9, color: 'rgba(255,184,0,0.6)', marginTop: 2 }}>
                restante
              </span>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800,
              color: isError ? '#FF1744' : '#fff',
            }}>
              {Math.round(displayed)}%
            </div>
          </div>
        </div>
      </div>

      {/* Barra */}
      <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${displayed}%`,
          background: isError ? '#FF1744' : 'linear-gradient(90deg, #FFB800, #FF8C00)',
          borderRadius: 4,
          boxShadow: isError ? 'none' : '0 0 14px rgba(255,184,0,0.6)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Etapas */}
      {!isError && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          {steps.map(step => (
            <div key={step.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: displayed >= step.at ? '#FFB800' : 'rgba(255,255,255,0.15)',
                boxShadow: displayed >= step.at ? '0 0 6px #FFB800' : 'none',
                transition: 'all 0.3s',
              }} />
              <span style={{
                fontFamily: 'Sora, sans-serif', fontSize: 9,
                color: displayed >= step.at ? '#FFB800' : 'rgba(255,255,255,0.25)',
                transition: 'color 0.3s',
              }}>{step.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
