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
    const contentType = req.headers.get('content-type') || ''

    // Modo local: recebe FormData com os arquivos diretamente
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const files = formData.getAll('video') as File[]
      if (!files || files.length === 0)
        return NextResponse.json({ error: 'Nenhum vídeo enviado' }, { status: 400 })

      const id = uuidv4()
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', id)
      if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })

      if (files.length === 1) {
        const file = files[0]
        const ext = file.name.split('.').pop() || 'mp4'
        const filePath = path.join(uploadDir, `original.${ext}`)
        await writeFile(filePath, Buffer.from(await file.arrayBuffer()))
        return NextResponse.json({ id, originalVideo: `/uploads/${id}/original.${ext}` })
      }

      const savedPaths: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop() || 'mp4'
        const filePath = path.join(uploadDir, `part${i + 1}.${ext}`)
        await writeFile(filePath, Buffer.from(await file.arrayBuffer()))
        savedPaths.push(filePath)
      }

      const listPath = path.join(uploadDir, 'concat_list.txt')
      writeFileSync(listPath, savedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'))
      const outputPath = path.join(uploadDir, 'original.mp4')
      await execAsync(
        `ffmpeg -f concat -safe 0 -i "${listPath}" -c:v libx264 -crf 23 -preset fast -r 30 -c:a aac -b:a 128k -y "${outputPath}"`,
        { timeout: 300000 }
      )
      return NextResponse.json({ id, originalVideo: `/uploads/${id}/original.mp4`, videosJoined: files.length })
    }

    // Modo produção: recebe JSON com paths do Supabase Storage
    const { id, paths } = await req.json() as { id: string; paths: string[] }
    if (!id || !paths || paths.length === 0)
      return NextResponse.json({ error: 'id e paths são obrigatórios' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', id)
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })

    if (paths.length === 1) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${paths[0]}`
      const res = await fetch(publicUrl)
      if (!res.ok) throw new Error(`Download do storage falhou: ${res.status} ${res.statusText}`)
      const ext = paths[0].split('.').pop() || 'mp4'
      const filePath = path.join(uploadDir, `original.${ext}`)
      await writeFile(filePath, Buffer.from(await res.arrayBuffer()))
      return NextResponse.json({ id, originalVideo: `/uploads/${id}/original.${ext}` })
    }

    const savedPaths: string[] = []
    for (let i = 0; i < paths.length; i++) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${paths[i]}`
      const res = await fetch(publicUrl)
      if (!res.ok) throw new Error(`Download ${i + 1} falhou: ${res.status}`)
      const ext = paths[i].split('.').pop() || 'mp4'
      const filePath = path.join(uploadDir, `part${i + 1}.${ext}`)
      await writeFile(filePath, Buffer.from(await res.arrayBuffer()))
      savedPaths.push(filePath)
    }

    const listPath = path.join(uploadDir, 'concat_list.txt')
    writeFileSync(listPath, savedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'))
    const outputPath = path.join(uploadDir, 'original.mp4')
    await execAsync(
      `ffmpeg -f concat -safe 0 -i "${listPath}" -c:v libx264 -crf 23 -preset fast -r 30 -c:a aac -b:a 128k -y "${outputPath}"`,
      { timeout: 300000 }
    )
    return NextResponse.json({ id, originalVideo: `/uploads/${id}/original.mp4`, videosJoined: paths.length })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[upload error]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
