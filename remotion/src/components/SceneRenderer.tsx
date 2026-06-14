import React from 'react'
import { SceneWithFrames } from '../utils'
import { Palette } from '../types'
import { SceneA } from './scenes/SceneA'
import { SceneE } from './scenes/SceneE'
import { SceneG } from './scenes/SceneG'
import { SceneI } from './scenes/SceneI'

interface Props {
  scene: SceneWithFrames
  palette: Palette
}

export const SceneRenderer: React.FC<Props> = ({ scene, palette }) => {
  const p = { primary: palette.primary, accent: palette.accent }

  switch (scene.type) {
    case 'A': return <SceneA scene={scene} palette={p} />
    case 'G': return <SceneG scene={scene} palette={p} />
    case 'I': return <SceneI scene={scene} palette={p} />
    case 'B':
    case 'C':
    case 'D':
    case 'E':
    case 'F':
    case 'H':
    case 'BONECO':
    default:
      return <SceneE scene={scene} palette={p} />
  }
}
