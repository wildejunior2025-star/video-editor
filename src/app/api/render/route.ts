import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync, writeFileSync } from 'fs'
import { ProjectData, LegendaSegment, Scene } from '@/types'

const execAsync = promisify(exec)
export const maxDuration = 600

const isWindows = process.platform === 'win32'
const FONT_BOLD = isWindows
  ? '${FONT_BOLD}'
  : '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
const FONT_REGULAR = isWindows
  ? '${FONT_REGULAR}'
  : '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'

function toAssTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const cs = Math.floor((sec % 1) * 100)
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`
}

function hexToAssBGR(hex: string): string {
  const h = hex.replace('#','')
  return `&H00${h.slice(4,6)}${h.slice(2,4)}${h.slice(0,2)}&`.toUpperCase()
}

function buildAss(transcription: LegendaSegment[], accent: string, style: string = 'reveal', speed: number = 1): string {
  const assAccent = hexToAssBGR(accent)
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF&,${assAccent},&H00000000&,&H90000000&,-1,0,0,0,100,100,0,0,1,3,2,2,80,80,180,1
Style: Karaoke,Arial,72,&H00FFFFFF&,${assAccent},&H00000000&,&H90000000&,-1,0,0,0,100,100,0,0,1,3,2,2,80,80,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  // Ajusta todos os timestamps pelo fator de velocidade
  const t = (sec: number) => toAssTime(sec / speed)

  const lines: string[] = []
  const anchor = '{\\an2\\pos(540,1700)}'
  const MAX_W = 5 // máximo 5 palavras por linha = máximo 1 linha visível

  for (const seg of transcription) {
    if (!seg.text.trim()) continue

    // Estima timestamps por palavra sempre
    const rawWords = seg.text.trim().split(/\s+/).filter(Boolean)
    if (rawWords.length === 0) continue
    const hasReal = seg.words?.some(w => w.start > 0 && w.end > w.start)
    const words = hasReal
      ? seg.words
      : rawWords.map((w, i) => {
          const dur = (seg.end - seg.start) / rawWords.length
          return { word: w, start: seg.start + i * dur, end: seg.start + (i + 1) * dur, sentiment: 'neutral' as const }
        })

    // Chunks de max 5 palavras com janelas de tempo NÃO sobrepostas
    for (let ci = 0; ci < words.length; ci += MAX_W) {
      const chunk = words.slice(ci, ci + MAX_W)
      const chunkStart = chunk[0].start
      const chunkEnd = words[ci + MAX_W] ? words[ci + MAX_W].start : seg.end
      if (chunkEnd <= chunkStart) continue
      const text = chunk.map(w => w.word).join(' ')
      lines.push(`Dialogue: 0,${t(chunkStart)},${t(chunkEnd)},Default,,0,0,0,,${anchor}${text}`)
    }
  }
  return header + lines.join('\n')
}

// Escapa texto para uso seguro no filtro drawtext do FFmpeg
function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')  // backslash primeiro
    .replace(/'/g, "\\'")    // aspas simples
    .replace(/:/g, '\\:')    // dois pontos
    .replace(/,/g, '\\,')    // vírgula
    .replace(/%/g, '%%')     // percentual
    .replace(/\[/g, '\\[')   // colchete abre
    .replace(/\]/g, '\\]')   // colchete fecha
    .replace(/\n/g, ' ')     // newline vira espaço
    .slice(0, 60)
}

// Quebra texto em linhas para o drawtext do FFmpeg
function wrapText(text: string, maxChars = 22): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      lines.push(current.trim())
      current = word
    } else {
      current = current ? current + ' ' + word : word
    }
  }
  if (current) lines.push(current.trim())
  return lines
}

function buildSceneFilters(scenes: Scene[], transcription: LegendaSegment[], W: number, H: number, speed: number = 1, palette?: { primary: string; secondary: string; accent: string; opacity?: number }): string {
  const filters: string[] = []

  for (const scene of scenes) {
    const startSeg = transcription[scene.startLeg]
    if (!startSeg) continue
    const offset = scene.timeOffset || 0
    const sceneStart = ((startSeg.start + offset) / speed).toFixed(3)
    const endIdx = Math.min(scene.startLeg + scene.durationLegs - 1, transcription.length - 1)
    const endSeg = transcription[endIdx]
    const rawEnd = endSeg ? endSeg.end + offset : startSeg.start + offset + 3
    const sceneEnd = (Math.min(rawEnd, startSeg.start + offset + 3.5) / speed).toFixed(3)

    const enable = `between(t,${sceneStart},${sceneEnd})`
    const title = escapeDrawtext(String(scene.title || ''))
    const fs = scene.fontSize || (scene.type === 'G' ? 280 : 72)
    // Cor do texto: preferência da cena, senão branco
    const textColor = scene.textColor ? scene.textColor.replace('#','') : 'ffffff'
    const palPrimary = palette?.primary?.replace('#','') || '1a1a2e'
    const palAccent = palette?.accent?.replace('#','') || 'FFB800'
    const defaultBg = scene.bgColor ? scene.bgColor.replace('#','') : palPrimary
    const bgOpacity = palette?.opacity ?? 0.88

    if (scene.type === 'A' || scene.type === 'C') {
      // Usa a cor primary da paleta como fundo
      filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=${defaultBg}@${bgOpacity}:t=fill:enable='${enable}'`)
      // Faixa de destaque com accent no topo
      filters.push(`drawbox=x=0:y=0:w=${W}:h=12:color=${palAccent}@1:t=fill:enable='${enable}'`)

      // Respeita quebras manuais (\n) e auto-wrap para linhas longas
      const rawTitle = String(scene.title || '')
      const titleLines = rawTitle.includes('\n')
        ? rawTitle.split('\n').flatMap(l => wrapText(l, 22))
        : wrapText(rawTitle, 20)
      const lineHeight = fs * 1.25
      const totalHeight = titleLines.length * lineHeight
      const startY = H / 2 - totalHeight / 2 - (scene.subtitle ? 60 : 0)
      titleLines.forEach((line, li) => {
        const lineText = escapeDrawtext(line)
        const y = Math.round(startY + li * lineHeight)
        filters.push(`drawtext=text='${lineText}':fontsize=${fs}:fontcolor=0x${textColor}:x=(w-text_w)/2:y=${y}:fontfile=${FONT_BOLD}:shadowcolor=0x000000:shadowx=4:shadowy=4:enable='${enable}'`)
      })
      if (scene.subtitle) {
        const sub = escapeDrawtext(String(scene.subtitle))
        const subY = Math.round(startY + titleLines.length * lineHeight + 30)
        filters.push(`drawtext=text='${sub}':fontsize=${Math.round(fs*0.45)}:fontcolor=0x${palAccent}:x=(w-text_w)/2:y=${subY}:fontfile=${FONT_REGULAR}:enable='${enable}'`)
      }
    } else if (scene.type === 'G') {
      const num = escapeDrawtext(String(scene.number || scene.title || '')).slice(0, 10)
      filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=${defaultBg}@${bgOpacity}:t=fill:enable='${enable}'`)
      filters.push(`drawtext=text='${num}':fontsize=${fs}:fontcolor=0x${palAccent}:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=${FONT_BOLD}:shadowcolor=0x000000:shadowx=6:shadowy=6:enable='${enable}'`)
      if (scene.subtitle) {
        const sub = escapeDrawtext(String(scene.subtitle))
        filters.push(`drawtext=text='${sub}':fontsize=56:fontcolor=0xFFFFFF:x=(w-text_w)/2:y=h*0.62:fontfile=${FONT_REGULAR}:enable='${enable}'`)
      }
    } else if (scene.type === 'I') {
      filters.push(`drawbox=x=30:y=30:w=${W-60}:h=180:color=${palAccent}@0.95:t=fill:enable='${enable}'`)
      filters.push(`drawtext=text='${title}':fontsize=68:fontcolor=0x000000:x=(w-text_w)/2:y=60:fontfile=${FONT_BOLD}:enable='${enable}'`)
      if (scene.subtitle) {
        const sub = escapeDrawtext(String(scene.subtitle))
        filters.push(`drawtext=text='${sub}':fontsize=44:fontcolor=0x333333:x=(w-text_w)/2:y=140:fontfile=${FONT_REGULAR}:enable='${enable}'`)
      }
    } else if (scene.type === 'D') {
      filters.push(`drawbox=x=0:y=${Math.round(H*0.25)}:w=${W/2-2}:h=${Math.round(H*0.5)}:color=330000@0.85:t=fill:enable='${enable}'`)
      filters.push(`drawbox=x=${W/2+2}:y=${Math.round(H*0.25)}:w=${W/2-2}:h=${Math.round(H*0.5)}:color=003300@0.85:t=fill:enable='${enable}'`)
      if (scene.title) filters.push(`drawtext=text='${title}':fontsize=52:fontcolor=0x${palAccent}:x=(w-text_w)/2:y=${Math.round(H*0.2)}:fontfile=${FONT_BOLD}:enable='${enable}'`)
      const items = scene.items || ['Antes', 'Depois']
      const left = escapeDrawtext(String(items[0] || '')).slice(0, 20)
      const right = escapeDrawtext(String(items[1] || '')).slice(0, 20)
      filters.push(`drawtext=text='${left}':fontsize=58:fontcolor=0xFF6666:x=w/4-text_w/2:y=(h-text_h)/2:fontfile=${FONT_BOLD}:enable='${enable}'`)
      filters.push(`drawtext=text='${right}':fontsize=58:fontcolor=0x66FF88:x=3*w/4-text_w/2:y=(h-text_h)/2:fontfile=${FONT_BOLD}:enable='${enable}'`)
    } else {
      filters.push(`drawbox=x=30:y=30:w=${W-60}:h=220:color=${defaultBg}@${bgOpacity}:t=fill:enable='${enable}'`)
      filters.push(`drawbox=x=30:y=30:w=10:h=220:color=${palAccent}@1:t=fill:enable='${enable}'`)
      const cardLines = wrapText(String(scene.title || ''), 28)
      cardLines.forEach((line, li) => {
        const lineText = escapeDrawtext(line)
        filters.push(`drawtext=text='${lineText}':fontsize=${fs}:fontcolor=0x${textColor}:x=70:y=${50 + li * Math.round(fs * 1.2)}:fontfile=${FONT_BOLD}:shadowcolor=0x000000:shadowx=2:shadowy=2:enable='${enable}'`)
      })
      if (scene.body) {
        const body = escapeDrawtext(String(scene.body))
        filters.push(`drawtext=text='${body}':fontsize=46:fontcolor=0xAAAAAA:x=70:y=150:fontfile=${FONT_REGULAR}:enable='${enable}'`)
      }
    }
  }
  return filters.join(',')
}

export async function POST(req: NextRequest) {
  try {
    const project: ProjectData = await req.json()

    const outputDir = path.join(process.cwd(), 'public', 'uploads', project.id)
    const outputPath = path.join(outputDir, 'output.mp4')
    const assPath = path.join(outputDir, 'subs.ass')

    const videoPath = path.join(process.cwd(), 'public',
      project.normalizedVideo.startsWith('/') ? project.normalizedVideo.slice(1) : project.normalizedVideo
    )
    if (!existsSync(videoPath)) {
      return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 })
    }

    const speed = project.speed || 1

    // Gera legendas ASS
    const accent = project.analysis?.palette?.accent || '#FFB800'
    const subtitleStyle = project.subtitleStyle || 'reveal'
    writeFileSync(assPath, buildAss(project.transcription, accent, subtitleStyle, speed), 'utf8')

    const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')

    // Aplica cortes manuais se existirem
    const manualCuts = project.manualCuts || []
    let finalVideoPath = videoPath
    if (manualCuts.length > 0) {
      console.log('[render] aplicando', manualCuts.length, 'cortes manuais...')
      const cutVideoPath = path.join(outputDir, 'cut.mp4')

      // Calcula segmentos a MANTER (inverso dos cortes)
      const duration = parseFloat((await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      )).stdout.trim())

      // Ordena cortes por início
      const sortedCuts = [...manualCuts].sort((a, b) => a.start - b.start)

      // Monta segmentos a manter
      const keeps: { start: number; end: number }[] = []
      let pos = 0
      for (const cut of sortedCuts) {
        if (cut.start > pos) keeps.push({ start: pos, end: cut.start })
        pos = cut.end
      }
      if (pos < duration) keeps.push({ start: pos, end: duration })

      if (keeps.length > 0) {
        const filterParts: string[] = []
        const concatInputs: string[] = []
        keeps.forEach(({ start, end }, i) => {
          const dur = (end - start).toFixed(4)
          filterParts.push(
            `[0:v]trim=start=${start.toFixed(4)}:duration=${dur},setpts=PTS-STARTPTS,fps=60[v${i}];` +
            `[0:a]atrim=start=${start.toFixed(4)}:duration=${dur},asetpts=PTS-STARTPTS[a${i}]`
          )
          concatInputs.push(`[v${i}][a${i}]`)
        })
        const filterPath = path.join(outputDir, 'cut-filter.txt')
        const fc = filterParts.join(';') + ';' + concatInputs.join('') + `concat=n=${keeps.length}:v=1:a=1[outv][outa]`
        writeFileSync(filterPath, fc)
        await execAsync(`ffmpeg -i "${videoPath}" -filter_complex_script "${filterPath}" -map "[outv]" -map "[outa]" -c:v libx264 -crf 23 -preset fast -r 60 -vsync cfr -c:a aac -b:a 128k -y "${cutVideoPath}"`, { timeout: 120000 })
        finalVideoPath = cutVideoPath
        console.log('[render] cortes aplicados, segmentos mantidos:', keeps.length)
      }
    }

    writeFileSync(path.join(outputDir, 'render-progress.json'),
      JSON.stringify({ frame: 0, total: 1, percent: 20, status: 'compositing' }))

    // Captura screenshots das cenas via Puppeteer (visual idêntico ao preview)
    const scenes = project.analysis?.scenes || []
    const palette = project.analysis?.palette
    const scenePngs: { path: string; startTime: number; endTime: number }[] = []

    if (scenes.length > 0) {
      console.log('[render] capturando cenas com Puppeteer...')
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.default.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1080,1920'],
      })
      const page = await browser.newPage()
      await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
      const appPort = process.env.PORT || 3333
      await page.goto(`http://localhost:${appPort}/scene-capture`, { waitUntil: 'networkidle0' })
      await page.evaluate(() => {
        document.documentElement.style.cssText = 'background:transparent!important'
        document.body.style.cssText = 'background:transparent!important;margin:0;padding:0'
      })

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]
        const startSeg = project.transcription[scene.startLeg]
        if (!startSeg) continue
        const offset = scene.timeOffset || 0
        const sceneStart = (startSeg.start + offset) / speed
        const endIdx = Math.min(scene.startLeg + scene.durationLegs - 1, project.transcription.length - 1)
        const endSeg = project.transcription[endIdx]
        const rawEnd = endSeg ? endSeg.end + offset : startSeg.start + offset + 3
        const sceneEnd = Math.min(rawEnd, startSeg.start + offset + 3.5) / speed

        await page.evaluate((s, p) => {
          const w = window as unknown as { __setScene?: (scene: unknown, palette: unknown) => void }
          if (w.__setScene) w.__setScene(s, p)
        }, scene as unknown as Record<string, unknown>, palette as unknown as Record<string, unknown>)

        await new Promise(r => setTimeout(r, 800)) // aguarda React renderizar

        const pngPath = path.join(outputDir, `scene_${i}.png`)
        await page.screenshot({ path: pngPath as `${string}.png`, omitBackground: true, clip: { x: 0, y: 0, width: 1080, height: 1920 } })
        scenePngs.push({ path: pngPath, startTime: sceneStart, endTime: sceneEnd })

        writeFileSync(path.join(outputDir, 'render-progress.json'),
          JSON.stringify({ frame: i + 1, total: scenes.length, percent: Math.round(20 + (i / scenes.length) * 50), status: 'capturing' }))
      }
      await browser.close()
      console.log('[render] cenas capturadas:', scenePngs.length)
    }

    writeFileSync(path.join(outputDir, 'render-progress.json'),
      JSON.stringify({ frame: 1, total: 1, percent: 75, status: 'compositing' }))

    console.log('[render] iniciando FFmpeg, velocidade:', speed)

    // Monta comando FFmpeg com overlay das cenas PNG + legendas ASS
    const speed1 = speed !== 1
    const pts = (1 / speed).toFixed(6)
    const atempoChain = speed <= 2.0 ? `atempo=${speed}` : `atempo=2.0,atempo=${(speed/2).toFixed(4)}`

    let inputs = `-i "${finalVideoPath}"`
    scenePngs.forEach(s => { inputs += ` -i "${s.path}"` })

    let cmd: string

    if (scenePngs.length === 0) {
      // Sem cenas: apenas legendas
      if (speed1) {
        cmd = `ffmpeg -i "${finalVideoPath}" -filter_complex "[0:v]setpts=${pts}*PTS,ass='${assEscaped}'[outv];[0:a]${atempoChain}[outa]" -map "[outv]" -map "[outa]" -c:v libx264 -crf 20 -preset fast -pix_fmt yuv420p -c:a aac -b:a 128k -y "${outputPath}"`
      } else {
        cmd = `ffmpeg -i "${finalVideoPath}" -vf "ass='${assEscaped}'" -c:v libx264 -crf 20 -preset fast -pix_fmt yuv420p -c:a copy -y "${outputPath}"`
      }
    } else {
      // Com cenas: encadeia overlays
      const filterParts: string[] = []
      let lastV = speed1 ? 'speedV' : '0:v'
      if (speed1) filterParts.push(`[0:v]setpts=${pts}*PTS[speedV]`)

      scenePngs.forEach(({ startTime, endTime }, i) => {
        const idx = i + 1
        const outV = i === scenePngs.length - 1 ? 'sceneV' : `v${i}`
        filterParts.push(`[${lastV}][${idx}:v]overlay=0:0:enable='between(t,${startTime.toFixed(3)},${endTime.toFixed(3)})'[${outV}]`)
        lastV = outV
      })

      filterParts.push(`[sceneV]ass='${assEscaped}'[finalV]`)

      if (speed1) {
        filterParts.push(`[0:a]${atempoChain}[outa]`)
        cmd = `ffmpeg ${inputs} -filter_complex "${filterParts.join(';')}" -map "[finalV]" -map "[outa]" -c:v libx264 -crf 20 -preset fast -pix_fmt yuv420p -c:a aac -b:a 128k -y "${outputPath}"`
      } else {
        cmd = `ffmpeg ${inputs} -filter_complex "${filterParts.join(';')}" -map "[finalV]" -map 0:a -c:v libx264 -crf 20 -preset fast -pix_fmt yuv420p -c:a copy -y "${outputPath}"`
      }
    }

    await execAsync(cmd, { timeout: 300000 })

    writeFileSync(path.join(outputDir, 'render-progress.json'),
      JSON.stringify({ frame: 1, total: 1, percent: 100, status: 'done' }))

    console.log('[render] concluído!')
    return NextResponse.json({ outputVideo: `/uploads/${project.id}/output.mp4` })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[render error]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
