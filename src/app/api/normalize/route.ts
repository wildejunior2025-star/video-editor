import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync, writeFileSync } from 'fs'
import { LegendaSegment } from '@/types'
import { SpeechInterval } from '@/lib/recalcTimestamps'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const { id, originalVideo, transcription, noiseReduction, noiseLevel } = await req.json()

  try {
    const inputPath = path.join(process.cwd(), 'public', originalVideo.startsWith('/') ? originalVideo.slice(1) : originalVideo)
    const outputDir = path.join(process.cwd(), 'public', 'uploads', id)
    const convertedPath = path.join(outputDir, 'converted.mp4')
    const normalizedPath = path.join(outputDir, 'normalized.mp4')

    if (!existsSync(inputPath)) {
      return NextResponse.json({ normalizedVideo: originalVideo, speechIntervals: null })
    }

    // Filtros por nível de redução de ruído
    const noiseFilters: Record<string, string> = {
      leve:  'afftdn=nf=-50,highpass=f=80,lowpass=f=8000',   // suave — preserva voz
      medio: 'afftdn=nf=-40,highpass=f=100,lowpass=f=7000',  // equilibrado
      forte: 'afftdn=nf=-25,highpass=f=150,lowpass=f=5000',  // agressivo
    }
    const audioFilter = noiseReduction
      ? `-af "${noiseFilters[noiseLevel] || noiseFilters.leve}"`
      : ''

    // Etapa 1: converter para H.264 CFR 60fps com redução de ruído opcional
    await execAsync(`ffmpeg -i "${inputPath}" -vcodec libx264 -crf 23 -preset fast -r 60 -g 60 ${audioFilter} -acodec aac -b:a 128k -y "${convertedPath}"`)
    console.log('[normalize] conversão ok')

    // Etapa 2: cortar silêncios se tiver transcrição
    if (transcription && transcription.length > 0) {
      const segments: LegendaSegment[] = transcription
      const SILENCE_THRESHOLD = 0.5
      const PADDING = 0.15

      // Monta intervalos de fala
      const rawIntervals: { start: number; end: number }[] = []
      for (const seg of segments) {
        const start = Math.max(0, seg.start - PADDING)
        const end = seg.end + PADDING
        if (rawIntervals.length === 0) {
          rawIntervals.push({ start, end })
        } else {
          const last = rawIntervals[rawIntervals.length - 1]
          if (start - last.end < SILENCE_THRESHOLD) {
            last.end = Math.max(last.end, end)
          } else {
            rawIntervals.push({ start, end })
          }
        }
      }

      // Calcula newStart para cada intervalo (tempo no vídeo após cortes)
      let accumulatedTime = 0
      const speechIntervals: SpeechInterval[] = rawIntervals.map((interval) => {
        const si: SpeechInterval = {
          start: interval.start,
          end: interval.end,
          newStart: accumulatedTime,
        }
        accumulatedTime += interval.end - interval.start
        return si
      })

      if (rawIntervals.length > 1) {
        const filterParts: string[] = []
        const concatInputs: string[] = []

        rawIntervals.forEach((interval, i) => {
          const duration = (interval.end - interval.start).toFixed(4)
          const start = interval.start.toFixed(4)
          filterParts.push(
            `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,fps=60[v${i}];` +
            `[0:a]atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS[a${i}]`
          )
          concatInputs.push(`[v${i}][a${i}]`)
        })

        const n = rawIntervals.length
        const filterComplex =
          filterParts.join(';') + ';' +
          concatInputs.join('') +
          `concat=n=${n}:v=1:a=1[outv][outa]`

        const filterPath = path.join(outputDir, 'filter.txt')
        writeFileSync(filterPath, filterComplex)

        // -r 60 -vsync cfr garante frame rate constante sem câmera lenta
        const cutCmd = `ffmpeg -i "${convertedPath}" -filter_complex_script "${filterPath}" -map "[outv]" -map "[outa]" -c:v libx264 -crf 23 -preset fast -r 60 -vsync cfr -c:a aac -b:a 128k -y "${normalizedPath}"`
        await execAsync(cutCmd, { timeout: 120000 })
        console.log('[normalize] corte ok, intervalos:', n)

        return NextResponse.json({
          normalizedVideo: `/uploads/${id}/normalized.mp4`,
          speechIntervals,
        })
      }
    }

    // Sem cortes: só copia
    await execAsync(`ffmpeg -i "${convertedPath}" -c copy -y "${normalizedPath}"`)
    return NextResponse.json({
      normalizedVideo: `/uploads/${id}/normalized.mp4`,
      speechIntervals: null,
    })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[normalize error]', msg)
    return NextResponse.json({ normalizedVideo: originalVideo, speechIntervals: null, warning: msg })
  }
}
