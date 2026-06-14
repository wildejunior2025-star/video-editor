import React from 'react'
import { AbsoluteFill, OffthreadVideo, Sequence, useVideoConfig } from 'remotion'
import { VideoProps } from './types'
import { convertScenesFromLegendaIndex } from './utils'
import { Legendas } from './components/Legendas'
import { SceneRenderer } from './components/SceneRenderer'

export const VideoComposition: React.FC<VideoProps> = ({
  videoSrc,
  transcription,
  scenes,
  palette,
}) => {
  const { durationInFrames } = useVideoConfig()
  const scenesWithFrames = convertScenesFromLegendaIndex(scenes, transcription)

  return (
    <AbsoluteFill style={{ background: '#050508' }}>
      {/* Camada 1: vídeo original */}
      <OffthreadVideo src={videoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Camada 2: cenas visuais */}
      {scenesWithFrames.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={Math.max(scene.endFrame - scene.startFrame, 30)}
        >
          <SceneRenderer scene={scene} palette={palette} />
        </Sequence>
      ))}

      {/* Camada 3: legendas TikTok */}
      <Legendas transcription={transcription} accentColor={palette.accent} />
    </AbsoluteFill>
  )
}
