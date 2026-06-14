import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const progressFile = path.join(process.cwd(), 'public', 'uploads', params.id, 'render-progress.json')
  if (!existsSync(progressFile)) {
    return NextResponse.json({ frame: 0, total: 0, percent: 10, status: 'starting' })
  }
  try {
    const data = JSON.parse(readFileSync(progressFile, 'utf8'))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ frame: 0, total: 0, percent: 10, status: 'starting' })
  }
}
