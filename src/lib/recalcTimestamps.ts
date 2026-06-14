import { LegendaSegment } from '@/types'

export interface SpeechInterval {
  start: number
  end: number
  newStart: number // tempo no vídeo cortado
}

/**
 * Recalcula os timestamps da transcrição após o corte de silêncios.
 * Para cada palavra/segmento, subtrai o total de tempo removido antes dela.
 */
export function recalcTimestamps(
  transcription: LegendaSegment[],
  speechIntervals: SpeechInterval[]
): LegendaSegment[] {
  function getNewTime(originalTime: number): number {
    // Encontra em qual intervalo de fala esse tempo cai
    for (const interval of speechIntervals) {
      if (originalTime >= interval.start && originalTime <= interval.end) {
        // Está dentro de um intervalo de fala: desloca pelo offset
        return interval.newStart + (originalTime - interval.start)
      }
    }
    // Está num silêncio: mapeia para o início do próximo intervalo de fala
    for (const interval of speechIntervals) {
      if (originalTime < interval.start) {
        return interval.newStart
      }
    }
    // Depois do último intervalo
    const last = speechIntervals[speechIntervals.length - 1]
    return last ? last.newStart + (last.end - last.start) : originalTime
  }

  return transcription.map((seg) => ({
    ...seg,
    start: getNewTime(seg.start),
    end: getNewTime(seg.end),
    words: seg.words.map((w) => ({
      ...w,
      start: getNewTime(w.start),
      end: getNewTime(w.end),
    })),
  }))
}
