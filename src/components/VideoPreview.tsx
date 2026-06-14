'use client'
import React, { useRef, useState, useEffect } from 'react'
import { LegendaSegment, Scene } from '@/types'
import {
  SceneFullScreen, SceneLowerThird, SceneSplit, SceneSplitVertical,
  SceneCard, SceneMessage, SceneNumber, SceneFlow, SceneCTA, SceneBoneco
} from './scenes/SceneOverlay'

interface Props {
  src: string
  transcription: LegendaSegment[]
  scenes: Scene[]
  accentColor?: string
  primaryColor?: string
  subtitleStyle?: 'reveal' | 'karaoke' | 'classic'
  bgOpacity?: number
}

function SceneRenderer({ scene, accent, primary, index, bgOpacity = 0.88 }: { scene: Scene; accent: string; primary: string; index: number; bgOpacity?: number }) {
  const p = { scene, accent, primary, bgOpacity }
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

export const VideoPreview: React.FC<Props> = React.memo(({
  src, transcription, scenes,
  accentColor = '#FFB800', primaryColor = '#1a1a2e',
  subtitleStyle = 'reveal',
  bgOpacity = 0.88,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [sceneKey, setSceneKey] = useState('')

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const update = () => setCurrentTime(v.currentTime)
    v.addEventListener('timeupdate', update)
    return () => v.removeEventListener('timeupdate', update)
  }, [])

  const currentSegIndex = transcription.findIndex(
    s => currentTime >= s.start && currentTime <= s.end
  )
  const rawSeg = transcription[currentSegIndex]

  // Limita a 7 palavras por vez (máximo 2 linhas na tela)
  const MAX_WORDS_PREVIEW = 7
  const currentSeg = (() => {
    if (!rawSeg) return undefined
    const words = rawSeg.words?.filter(w => w.start > 0) || []
    if (words.length <= MAX_WORDS_PREVIEW) return rawSeg
    for (let i = 0; i < words.length; i += MAX_WORDS_PREVIEW) {
      const chunk = words.slice(i, i + MAX_WORDS_PREVIEW)
      const chunkStart = chunk[0].start
      const chunkEnd = chunk[chunk.length - 1].end
      if (currentTime >= chunkStart && currentTime <= chunkEnd) {
        return { ...rawSeg, text: chunk.map(w => w.word).join(' '), words: chunk }
      }
    }
    return rawSeg
  })()

  const MAX_SCENE_DURATION = 3.5 // segundos máximos por cena

  const activeSceneIndex = scenes.findIndex(scene => {
    const startSeg = transcription[scene.startLeg]
    if (!startSeg) return false

    const offset = scene.timeOffset || 0
    const sceneStart = startSeg.start + offset
    const endSegIndex = Math.min(scene.startLeg + scene.durationLegs - 1, transcription.length - 1)
    const endSeg = transcription[endSegIndex]
    const sceneEnd = Math.min(
      endSeg ? endSeg.end + offset : sceneStart + MAX_SCENE_DURATION,
      sceneStart + MAX_SCENE_DURATION
    )

    return currentTime >= sceneStart && currentTime <= sceneEnd
  })
  const activeScene = activeSceneIndex >= 0 ? scenes[activeSceneIndex] : undefined

  // Recria o componente de cena quando muda
  useEffect(() => {
    setSceneKey(activeScene?.id || '')
  }, [activeScene?.id])

  const hasWordTimestamps = currentSeg?.words?.some(w => w.start > 0)

  return (
    <div style={{
      position: 'relative', borderRadius: 16, overflow: 'hidden',
      background: '#000', aspectRatio: '9/16',
    }}>
      <video
        ref={videoRef}
        src={src}
        controls
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Cena animada */}
      {activeScene && (
        <div key={sceneKey} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
          <SceneRenderer
            scene={activeScene}
            accent={accentColor}
            primary={primaryColor}
            index={activeSceneIndex}
            bgOpacity={bgOpacity}
          />
        </div>
      )}

      {/* Legendas — sempre na frente de tudo */}
      {currentSeg && (
        <div style={{
          position: 'absolute', bottom: 60, left: 0, right: 0,
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: '2px 6px', padding: '8px 16px',
          pointerEvents: 'none', zIndex: 100,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%)',
        }}>
          {subtitleStyle === 'classic' ? (
            <span style={{
              fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: '#fff',
              textShadow: '0 2px 10px rgba(0,0,0,0.95)', textAlign: 'center', lineHeight: 1.4,
              background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 8,
            }}>{currentSeg.text}</span>

          ) : subtitleStyle === 'karaoke' ? (
            // Todas as palavras visíveis — ativa acende, futuras dimmed
            hasWordTimestamps
              ? currentSeg.words.map((w, i) => {
                  const isActive = currentTime >= w.start && currentTime <= w.end
                  const isPast = currentTime > w.end
                  const isFuture = currentTime < w.start
                  return (
                    <span key={i} style={{
                      fontFamily: 'Sora, sans-serif',
                      fontSize: isActive ? 20 : 18,
                      fontWeight: 800,
                      color: isActive ? accentColor : isPast ? '#fff' : 'rgba(255,255,255,0.35)',
                      textShadow: isActive ? `0 0 20px ${accentColor}80, 0 2px 10px rgba(0,0,0,0.95)` : '0 2px 8px rgba(0,0,0,0.95)',
                      transform: isActive ? 'scale(1.12)' : 'scale(1)',
                      display: 'inline-block',
                      transition: 'all 0.08s ease',
                    }}>{w.word}</span>
                  )
                })
              : <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}>{currentSeg.text}</span>

          ) : (
            // REVEAL — palavras aparecem uma a uma conforme são faladas
            hasWordTimestamps
              ? currentSeg.words.filter(w => currentTime >= w.start).map((w, i, arr) => {
                  const isLatest = i === arr.length - 1
                  const isActive = currentTime >= w.start && currentTime <= w.end
                  return (
                    <span key={w.start} style={{
                      fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800,
                      color: isActive ? accentColor : '#fff',
                      textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                      transform: isActive ? 'scale(1.12)' : 'scale(1)',
                      display: 'inline-block', transition: 'transform 0.06s',
                      animation: isLatest ? 'wordIn 0.15s ease-out' : 'none',
                    }}>{w.word}</span>
                  )
                })
              : <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}>{currentSeg.text}</span>
          )}
        </div>
      )}
      <style>{`@keyframes wordIn { from { opacity:0; transform:scale(0.6) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  )
})
