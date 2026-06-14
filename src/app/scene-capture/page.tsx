'use client'
import React, { useEffect, useState } from 'react'
import { Scene, VideoAnalysis } from '@/types'
import {
  SceneFullScreen, SceneLowerThird, SceneSplit, SceneSplitVertical,
  SceneCard, SceneMessage, SceneNumber, SceneFlow, SceneCTA, SceneBoneco
} from '@/components/scenes/SceneOverlay'

const W = 1080
const H = 1920
const SCALE = 3.6

function SceneRenderer({ scene, accent, primary }: { scene: Scene; accent: string; primary: string }) {
  // forceVisible=true pula animações — renderiza visível imediatamente para screenshot
  const p = { scene, accent, primary, scale: SCALE, forceVisible: true }
  switch (scene.type) {
    case 'A': return <SceneFullScreen {...p} />
    case 'B': return <SceneLowerThird {...p} />
    case 'C': return <SceneSplit {...p} />
    case 'D': return <SceneSplitVertical {...p} />
    case 'E': return <SceneCard {...p} index={0} />
    case 'F': return <SceneMessage {...p} />
    case 'G': return <SceneNumber {...p} />
    case 'H': return <SceneFlow {...p} />
    case 'I': return <SceneCTA {...p} />
    case 'BONECO': return <SceneBoneco {...p} />
    default: return <SceneCard {...p} index={0} />
  }
}

export default function SceneCapture() {
  const [scene, setScene] = useState<Scene | null>(null)
  const [palette, setPalette] = useState<VideoAnalysis['palette'] | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.cssText = 'background:transparent;margin:0;padding:0'

    ;(window as unknown as Record<string, unknown>).__setScene = (s: Scene, p: VideoAnalysis['palette']) => {
      setScene(s)
      setPalette(p)
      setReady(true) // força visível imediatamente
    }
    window.parent?.postMessage({ type: 'SCENE_CAPTURE_READY' }, '*')
  }, [])

  if (!scene || !palette) {
    return <div id="capture-container" style={{ width: W, height: H, background: 'transparent' }} />
  }

  return (
    <div
      id="capture-container"
      style={{ width: W, height: H, background: 'transparent', position: 'relative', overflow: 'hidden' }}
    >
      {ready && (
        <SceneRenderer scene={scene} accent={palette.accent} primary={palette.primary} />
      )}
    </div>
  )
}
