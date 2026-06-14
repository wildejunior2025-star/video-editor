import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync, writeFileSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('video') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum vídeo enviado' }, { status: 400 })
    }

    const id = uuidv4()
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', id)
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })

    if (files.length === 1) {
      // Upload simples
      const file = files[0]
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split('.').pop() || 'mp4'
      const filePath = path.join(uploadDir, `original.${ext}`)
      await writeFile(filePath, buffer)
      return NextResponse.json({ id, originalVideo: `/uploads/${id}/original.${ext}` })
    }

    // Múltiplos vídeos — salva cada um e concatena com FFmpeg
    const savedPaths: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split('.').pop() || 'mp4'
      const filePath = path.join(uploadDir, `part${i + 1}.${ext}`)
      await writeFile(filePath, buffer)
      savedPaths.push(filePath)
    }

    // Cria arquivo de lista para FFmpeg concat
    const listPath = path.join(uploadDir, 'concat_list.txt')
    const listContent = savedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n')
    writeFileSync(listPath, listContent)

    // Concatena todos os vídeos em um só
    const outputPath = path.join(uploadDir, 'original.mp4')
    const cmd = `ffmpeg -f concat -safe 0 -i "${listPath}" -c:v libx264 -crf 23 -preset fast -r 30 -c:a aac -b:a 128k -y "${outputPath}"`
    await execAsync(cmd, { timeout: 300000 })

    console.log(`[upload] ${files.length} vídeos concatenados com sucesso`)

    return NextResponse.json({
      id,
      originalVideo: `/uploads/${id}/original.mp4`,
      videosJoined: files.length,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[upload error]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
