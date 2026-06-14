import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { LegendaSegment, LegendaWord } from '@/types'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { normalizedVideo } = await req.json()

    const relativePath = normalizedVideo.startsWith('/') ? normalizedVideo.slice(1) : normalizedVideo
    const videoPath = path.join(process.cwd(), 'public', relativePath)

    console.log('[transcribe] path:', videoPath)

    if (!existsSync(videoPath)) {
      return NextResponse.json({ error: `Arquivo não encontrado: ${videoPath}` }, { status: 404 })
    }

    // Extrai áudio MP3 com FFmpeg antes de enviar (evita limite de 25MB do Whisper)
    const audioPath = videoPath.replace(/\.[^.]+$/, '_audio.mp3')
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    console.log('[transcribe] extraindo áudio...')
    await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ab 64k -ar 16000 -ac 1 -y "${audioPath}"`)

    const fileBuffer = readFileSync(audioPath)
    console.log('[transcribe] áudio extraído, tamanho:', fileBuffer.length, 'bytes')

    const formData = new FormData()
    const blob = new Blob([fileBuffer], { type: 'audio/mp3' })
    formData.append('file', blob, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')
    formData.append('timestamp_granularities[]', 'segment')
    formData.append('language', 'pt')

    console.log('[transcribe] enviando para Whisper via fetch...')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Whisper API erro ${response.status}: ${errText}`)
    }

    const data = await response.json()
    console.log('[transcribe] segmentos recebidos:', data.segments?.length)

    const segments: LegendaSegment[] = (data.segments ?? []).map((seg: {text: string; start: number; end: number; words?: {word: string; start: number; end: number}[]}, i: number) => {
      const words: LegendaWord[] = (seg.words ?? []).map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        sentiment: 'neutral' as const,
      }))
      return { id: i, text: seg.text.trim(), start: seg.start, end: seg.end, words }
    })

    return NextResponse.json({ transcription: segments })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[transcribe error]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
