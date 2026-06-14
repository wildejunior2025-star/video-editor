import React from 'react'
import { Composition } from 'remotion'
import { VideoComposition } from './VideoComposition'
import { VideoProps } from './types'
import { getTotalFrames, FPS, WIDTH, HEIGHT } from './utils'

const defaultProps: VideoProps = {
  videoSrc: '',
  transcription: [],
  scenes: [],
  palette: { primary: '#1a1a2e', secondary: '#16213e', accent: '#FFB800' },
}

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={getTotalFrames(defaultProps.transcription)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultProps}
    />
  )
}
