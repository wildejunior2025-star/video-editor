'use client'
import React, { useEffect, useState, useRef } from 'react'
import { ProjectData } from '@/types'
import {
  SceneFullScreen, SceneLowerThird, SceneSplit, SceneSplitVertical,
  SceneCard, SceneMessage, SceneNumber, SceneFlow, SceneCTA, SceneBoneco
} from '@/components/scenes/SceneOverlay'
import { Scene } from '@/types'

const FPS = 30
const W = 1080
const H = 1920

const RENDER_SCALE = 3.6

function SceneRenderer({ scene, accent, primary, index }: { scene: Scene; accent: string; primary: string; index: number }) {
  const p = { scene, accent, primary, scale: RENDER_SCALE }
  switch (scene.type) {
    case 'A': return <SceneFullScreen {...p} />
    case 'B': return <SceneLowerThird {...p} />
    case 'C': return <SceneSplit {...p} />
    case 'D': return <SceneSplitVertical {...p} />
    case 'E': return <SceneCard {...p} index={index} />
    case 'F': return <SceneMessage {...p} />
    case 'G': return <SceneNumber {...p} />
    case 'H': return <SceneFlow {...p} />
    case 'I': return <SceneCTA {...p} />
    case 'BONECO': return <SceneBoneco {...p} />
    default: return <SceneCard {...p} index={index} />
  }
}

export default function RenderPreview() {
  const [project, setProject] = useState<ProjectData | null>(null)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    // Recebe dados via postMessage do Puppeteer
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'SET_PROJECT') setProject(e.data.project)
      if (e.data.type === 'SET_FRAME') setFrame(e.data.frame)
    }
    window.addEventListener('message', handler)
    // Sinaliza que está pronto
    window.parent?.postMessage({ type: 'READY' }, '*')
    ;(window as unknown as Record<string, unknown>).__setFrame = (f: number) => setFrame(f)
    ;(window as unknown as Record<string, unknown>).__setProject = (p: ProjectData) => setProject(p)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!project) {
    return (
      <div id="render-ready" style={{ width: W, height: H, background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#FFB800', fontFamily: 'sans-serif' }}>Aguardando dados...</span>
      </div>
    )
  }

  const currentTime = frame / FPS
  const transcription = project.transcription || []
  const scenes = project.analysis?.scenes || []
  const accent = project.analysis?.palette?.accent || '#FFB800'
  const primary = project.analysis?.palette?.primary || '#1a1a2e'

  // Cena ativa
  const MAX_SCENE_DURATION = 3.5
  const activeSceneIndex = scenes.findIndex(scene => {
    const startSeg = transcription[scene.startLeg]
    if (!startSeg) return false
    const sceneStart = startSeg.start
    const endSegIndex = Math.min(scene.startLeg + scene.durationLegs - 1, transcription.length - 1)
    const endSeg = transcription[endSegIndex]
    const sceneEnd = Math.min(endSeg ? endSeg.end : sceneStart + MAX_SCENE_DURATION, sceneStart + MAX_SCENE_DURATION)
    return currentTime >= sceneStart && currentTime <= sceneEnd
  })
  const activeScene = activeSceneIndex >= 0 ? scenes[activeSceneIndex] : null

  // Legenda ativa
  const currentSeg = transcription.find(s => currentTime >= s.start && currentTime <= s.end)
  const hasWordTimestamps = currentSeg?.words?.some(w => w.start > 0)

  return (
    <div
      id="frame-container"
      style={{
        width: W, height: H,
        background: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Sora, sans-serif',
        // Fundo transparente — só renderiza as sobreposições
      }}
    >
      {/* Cena animada */}
      {activeScene && (
        <div key={`${activeScene.id}-${Math.floor(currentTime / MAX_SCENE_DURATION)}`}
          style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <SceneRenderer scene={activeScene} accent={accent} primary={primary} index={activeSceneIndex} />
        </div>
      )}

      {/* Legendas */}
      {currentSeg && (
        <div style={{
          position: 'absolute', bottom: 160, left: 0, right: 0,
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: '10px 18px', padding: '24px 80px',
          zIndex: 100,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%)',
        }}>
          {hasWordTimestamps
            ? currentSeg.words.map((w, i) => {
                const isActive = currentTime >= w.start && currentTime <= w.end
                const isPast = currentTime > w.end
                return (
                  <span key={i} style={{
                    fontSize: 88, fontWeight: 800,
                    color: isActive ? accent : isPast ? 'rgba(255,255,255,0.4)' : '#fff',
                    textShadow: '0 4px 16px rgba(0,0,0,0.95)',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    display: 'inline-block',
                    lineHeight: 1.2,
                  }}>{w.word}</span>
                )
              })
            : <span style={{
                fontSize: 80, fontWeight: 800, color: '#fff',
                textShadow: '0 4px 16px rgba(0,0,0,0.95)',
                textAlign: 'center', lineHeight: 1.3,
                background: 'rgba(0,0,0,0.55)', padding: '14px 36px', borderRadius: 18,
              }}>{currentSeg.text}</span>
          }
        </div>
      )}
    </div>
  )
}
