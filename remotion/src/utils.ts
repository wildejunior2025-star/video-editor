import { LegendaSegment, Scene } from './types'

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

export function segToFrame(seconds: number): number {
  return Math.round(seconds * FPS)
}

export function getTotalFrames(transcription: LegendaSegment[]): number {
  if (!transcription.length) return FPS * 60
  const last = transcription[transcription.length - 1]
  return segToFrame(last.end) + FPS * 2
}

export interface SceneWithFrames extends Scene {
  startFrame: number
  endFrame: number
}

export function convertScenesFromLegendaIndex(
  scenes: Scene[],
  transcription: LegendaSegment[]
): SceneWithFrames[] {
  return scenes.map((scene) => {
    const startSeg = transcription[scene.startLeg]
    const endIndex = Math.min(scene.startLeg + scene.durationLegs - 1, transcription.length - 1)
    const endSeg = transcription[endIndex]

    const startFrame = startSeg ? segToFrame(startSeg.start) : 0
    const endFrame = endSeg ? segToFrame(endSeg.end) : startFrame + FPS * 3

    return { ...scene, startFrame, endFrame }
  })
}
