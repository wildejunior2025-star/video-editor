import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync, existsSync } from 'fs'
import path from 'path'
import { Readable } from 'stream'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'uploads', params.id, 'output.mp4')

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    const stat = statSync(filePath)
    const fileSize = stat.size

    const rangeHeader = req.headers.get('range')

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      const stream = createReadStream(filePath, { start, end })
      const webStream = Readable.toWeb(stream) as ReadableStream

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'attachment; filename="video-editado.mp4"',
        },
      })
    }

    const stream = createReadStream(filePath)
    const webStream = Readable.toWeb(stream) as ReadableStream

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': 'attachment; filename="video-editado.mp4"',
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
