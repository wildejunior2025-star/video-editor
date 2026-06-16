'use client'
import React, { useEffect, useState } from 'react'
import { Scene } from '@/types'

const s = (px: number, scale = 1) => px * scale

interface Props {
  scene: Scene
  accent: string
  primary: string
  fontSize?: number
  scale?: number
  bgOpacity?: number
  forceVisible?: boolean
}

function useEntrance(sceneId: string, delay = 0, forceVisible = false) {
  const [visible, setVisible] = useState(forceVisible)
  const prevId = React.useRef(forceVisible ? sceneId : '')
  useEffect(() => {
    if (forceVisible) { setVisible(true); return }
    if (prevId.current !== sceneId) {
      prevId.current = sceneId
      setVisible(false)
      const t = setTimeout(() => setVisible(true), delay)
      return () => clearTimeout(t)
    }
  }, [sceneId, delay, forceVisible])
  if (!visible && prevId.current === sceneId) return true
  return visible
}

/* ─── A: FullScreen ─────────────────────────────────── */
export const SceneFullScreen: React.FC<Props> = ({ scene, accent, primary, scale: sc = 1, bgOpacity = 0.88, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  const fs = scene.fontSize || 32
  const bg = scene.bgColor || null
  const opHex = Math.round(bgOpacity * 255).toString(16).padStart(2, '0')
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: bg || `linear-gradient(160deg, ${primary}${opHex} 0%, rgba(5,5,8,${bgOpacity}) 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: `${s(32,sc)}px ${s(28,sc)}px`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.94)',
      transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      {scene.subtitle && (
        <div style={{
          fontFamily: 'Sora,sans-serif', fontSize: s(13,sc), fontWeight: 600,
          color: accent, letterSpacing: s(3,sc), textTransform: 'uppercase',
          marginBottom: s(16,sc), opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.5s ease 0.1s',
        }}>{scene.subtitle}</div>
      )}
      <h1 style={{
        fontFamily: 'Sora,sans-serif', fontSize: s(fs,sc), fontWeight: 800,
        color: scene.textColor || '#fff', textAlign: 'center', lineHeight: 1.2,
        textShadow: `0 0 ${s(40,sc)}px ${accent}60`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease 0.15s',
      }}>{scene.title}</h1>
      {scene.body && (
        <p style={{
          fontFamily: 'Sora,sans-serif', fontSize: s(16,sc), color: 'rgba(255,255,255,0.7)',
          textAlign: 'center', marginTop: s(16,sc), lineHeight: 1.5,
          opacity: visible ? 1 : 0, transition: 'all 0.5s ease 0.3s',
        }}>{scene.body}</p>
      )}
      <div style={{
        width: visible ? s(80,sc) : 0, height: s(3,sc), background: accent,
        borderRadius: 2, marginTop: s(24,sc),
        transition: 'width 0.6s ease 0.4s',
        boxShadow: `0 0 ${s(12,sc)}px ${accent}80`,
      }} />
    </div>
  )
}

/* ─── B: LowerThird ─────────────────────────────────── */
export const SceneLowerThird: React.FC<Props> = ({ scene, accent, scale: sc = 1, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-30px)',
      transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{
        background: 'rgba(5,5,8,0.88)',
        backdropFilter: 'blur(16px)',
        borderTop: `${s(3,sc)}px solid ${accent}`,
        padding: `${s(14,sc)}px ${s(20,sc)}px`,
      }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(20,sc), fontWeight: 800, color: '#fff' }}>
          {scene.title}
        </div>
        {scene.subtitle && (
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(14,sc), color: accent, marginTop: s(4,sc) }}>
            {scene.subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── C: Split ─────────────────────────────────────── */
export const SceneSplit: React.FC<Props> = ({ scene, accent, primary, scale: sc = 1, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: '45%',
      background: `linear-gradient(135deg, ${primary} 0%, rgba(5,5,8,0.97) 100%)`,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: `${s(20,sc)}px ${s(24,sc)}px`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-20px)',
      transition: 'all 0.4s ease',
      borderBottom: `${s(3,sc)}px solid ${accent}`,
    }}>
      {scene.subtitle && (
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(11,sc), color: accent, fontWeight: 600, letterSpacing: s(2,sc), textTransform: 'uppercase', marginBottom: s(8,sc) }}>
          {scene.subtitle}
        </div>
      )}
      <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: s(24,sc), fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
        {scene.title}
      </h2>
      {scene.body && (
        <p style={{ fontFamily: 'Sora,sans-serif', fontSize: s(14,sc), color: 'rgba(255,255,255,0.7)', marginTop: s(10,sc), lineHeight: 1.5 }}>
          {scene.body}
        </p>
      )}
    </div>
  )
}

/* ─── D: Comparativo ────────────────────────────────── */
export const SceneSplitVertical: React.FC<Props> = ({ scene, accent, scale: sc = 1, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  const items = scene.items || ['Antes', 'Depois']
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,8,0.92)',
      display: 'flex',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderRight: `${s(2,sc)}px solid ${accent}40`,
        padding: s(20,sc),
        transform: visible ? 'translateX(0)' : 'translateX(-30px)',
        transition: 'transform 0.5s ease',
        background: 'rgba(255,50,50,0.08)',
      }}>
        <div style={{ fontSize: s(36,sc), marginBottom: s(12,sc) }}>❌</div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(15,sc), fontWeight: 700, color: '#ff6b6b', textAlign: 'center' }}>
          {items[0]}
        </div>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: '30%', bottom: '30%',
        width: s(2,sc), background: accent,
        boxShadow: `0 0 ${s(12,sc)}px ${accent}`,
        transform: 'translateX(-50%)',
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        background: accent, color: '#000',
        width: s(36,sc), height: s(36,sc), borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Sora,sans-serif', fontSize: s(11,sc), fontWeight: 800,
      }}>VS</div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: s(20,sc),
        transform: visible ? 'translateX(0)' : 'translateX(30px)',
        transition: 'transform 0.5s ease 0.1s',
        background: 'rgba(50,255,100,0.08)',
      }}>
        <div style={{ fontSize: s(36,sc), marginBottom: s(12,sc) }}>✅</div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(15,sc), fontWeight: 700, color: '#51cf66', textAlign: 'center' }}>
          {items[1] || scene.subtitle || 'Depois'}
        </div>
      </div>
      {scene.title && (
        <div style={{
          position: 'absolute', top: s(24,sc), left: 0, right: 0, textAlign: 'center',
          fontFamily: 'Sora,sans-serif', fontSize: s(16,sc), fontWeight: 800, color: accent,
        }}>{scene.title}</div>
      )}
    </div>
  )
}

/* ─── E: Card ────────────────────────────────────────── */
export const SceneCard: React.FC<Props & { index?: number }> = ({ scene, accent, index = 0, scale: sc = 1, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  return (
    <div style={{
      position: 'absolute', top: s(16,sc), left: s(16,sc), right: s(16,sc),
      background: scene.bgColor || 'rgba(5,5,8,0.92)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${accent}30`,
      borderLeft: `${s(4,sc)}px solid ${accent}`,
      borderRadius: s(14,sc),
      padding: `${s(16,sc)}px ${s(18,sc)}px`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
      transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      boxShadow: `0 ${s(8,sc)}px ${s(32,sc)}px rgba(0,0,0,0.5), 0 0 0 1px ${accent}15`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: s(12,sc) }}>
        <div style={{
          width: s(38,sc), height: s(38,sc), borderRadius: s(10,sc),
          background: `linear-gradient(135deg, ${accent}, #CC9200)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Sora,sans-serif', fontSize: scene.icon ? s(18,sc) : s(16,sc),
          fontWeight: 800, color: '#000', flexShrink: 0,
        }}>
          {scene.icon || (index + 1)}
        </div>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(16,sc), fontWeight: 700, color: scene.textColor || accent }}>
            {scene.title}
          </div>
          {scene.body && (
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(12,sc), color: scene.textColor ? scene.textColor + 'bb' : 'rgba(255,255,255,0.65)', marginTop: s(3,sc), lineHeight: 1.4 }}>
              {scene.body}
            </div>
          )}
        </div>
      </div>
      {scene.items && scene.items.length > 0 && (
        <div style={{ marginTop: s(10,sc), display: 'flex', flexDirection: 'column', gap: s(6,sc) }}>
          {scene.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: s(8,sc) }}>
              <div style={{ width: s(6,sc), height: s(6,sc), borderRadius: '50%', background: accent, flexShrink: 0 }} />
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: s(12,sc), color: 'rgba(255,255,255,0.75)' }}>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── F: Mensagem ────────────────────────────────────── */
export const SceneMessage: React.FC<Props> = ({ scene, accent, scale: sc = 1, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  return (
    <div style={{
      position: 'absolute', top: s(16,sc), left: s(16,sc), right: s(16,sc),
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.9)',
      transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{
        background: '#1a472a',
        borderRadius: `${s(18,sc)}px ${s(18,sc)}px ${s(4,sc)}px ${s(18,sc)}px`,
        padding: `${s(12,sc)}px ${s(16,sc)}px`,
        maxWidth: '80%',
        marginLeft: 'auto',
        boxShadow: `0 ${s(4,sc)}px ${s(16,sc)}px rgba(0,0,0,0.4)`,
      }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(14,sc), color: '#fff', lineHeight: 1.4 }}>
          {scene.title}
        </div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(10,sc), color: accent, marginTop: s(4,sc), textAlign: 'right' }}>
          ✓✓ agora
        </div>
      </div>
    </div>
  )
}

/* ─── G: Número ──────────────────────────────────────── */
export const SceneNumber: React.FC<Props> = ({ scene, accent, scale: sc = 1, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  const fs = scene.fontSize || 110
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,8,0.75)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        fontFamily: 'Sora,sans-serif',
        fontSize: s(fs,sc), fontWeight: 800,
        color: accent,
        transform: visible ? 'scale(1)' : 'scale(0.4)',
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        textShadow: `0 0 ${s(60,sc)}px ${accent}60`,
        lineHeight: 1,
      }}>
        {scene.number || scene.title}
      </div>
      {scene.subtitle && (
        <div style={{
          fontFamily: 'Sora,sans-serif', fontSize: s(18,sc), color: '#fff',
          marginTop: s(16,sc), opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.4s ease 0.3s',
          textAlign: 'center', padding: `0 ${s(32,sc)}px`,
        }}>{scene.subtitle}</div>
      )}
    </div>
  )
}

/* ─── H: Fluxo ───────────────────────────────────────── */
export const SceneFlow: React.FC<Props> = ({ scene, accent, scale: sc = 1, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  const steps = scene.items || [scene.title || '', scene.subtitle || '', scene.body || ''].filter(Boolean)
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,8,0.9)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: `${s(20,sc)}px ${s(24,sc)}px`,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      {scene.title && (
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(18,sc), fontWeight: 800, color: accent, marginBottom: s(24,sc), textAlign: 'center' }}>
          {scene.title}
        </div>
      )}
      {steps.map((step, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: s(14,sc),
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0)' : 'translateX(-20px)',
          transition: `all 0.4s ease ${i * 0.1}s`,
          width: '100%',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: s(32,sc), height: s(32,sc), borderRadius: '50%',
              background: `linear-gradient(135deg, ${accent}, #CC9200)`,
              color: '#000', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: 'Sora,sans-serif',
              fontSize: s(14,sc), fontWeight: 800, flexShrink: 0,
            }}>{i + 1}</div>
            {i < steps.length - 1 && (
              <div style={{ width: s(2,sc), height: s(24,sc), background: `${accent}40`, margin: `${s(4,sc)}px 0` }} />
            )}
          </div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(14,sc), color: '#fff', lineHeight: 1.4 }}>
            {step}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── I: CTA ─────────────────────────────────────────── */
export const SceneCTA: React.FC<Props> = ({ scene, accent, scale: sc = 1, forceVisible }) => {
  const [pulse, setPulse] = useState(false)
  const visible = useEntrance(scene.id, 0, forceVisible)

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'absolute', top: s(16,sc), left: s(16,sc), right: s(16,sc),
      background: `linear-gradient(135deg, ${accent}, #CC9200)`,
      borderRadius: s(16,sc), padding: `${s(18,sc)}px ${s(20,sc)}px`,
      opacity: visible ? 1 : 0,
      transform: visible ? `translateY(0) scale(${pulse ? 1.02 : 1})` : 'translateY(30px) scale(0.9)',
      transition: visible ? 'opacity 0.4s ease, transform 0.8s ease' : 'all 0.4s ease',
      boxShadow: `0 ${s(8,sc)}px ${s(32,sc)}px ${accent}50`,
    }}>
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(20,sc), fontWeight: 800, color: '#000', lineHeight: 1.2 }}>
        {scene.title}
      </div>
      {scene.subtitle && (
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(13,sc), color: 'rgba(0,0,0,0.7)', marginTop: s(6,sc) }}>
          {scene.subtitle}
        </div>
      )}
    </div>
  )
}

/* ─── BONECO ─────────────────────────────────────────── */
export const SceneBoneco: React.FC<Props> = ({ scene, accent, scale: sc = 1, forceVisible }) => {
  const visible = useEntrance(scene.id, 0, forceVisible)
  return (
    <div style={{
      position: 'absolute', top: s(16,sc), left: s(16,sc), right: s(16,sc),
      background: 'rgba(5,5,8,0.9)',
      border: `1px solid ${accent}30`,
      borderRadius: s(14,sc), padding: `${s(16,sc)}px ${s(18,sc)}px`,
      display: 'flex', alignItems: 'center', gap: s(16,sc),
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{ fontSize: s(48,sc), lineHeight: 1 }}>🧍</div>
      <div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(15,sc), fontWeight: 700, color: accent }}>
          {scene.title}
        </div>
        {scene.body && (
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: s(12,sc), color: 'rgba(255,255,255,0.65)', marginTop: s(4,sc) }}>
            {scene.body}
          </div>
        )}
      </div>
    </div>
  )
}
