import { NextRequest, NextResponse } from 'next/server'
import { VideoAnalysis, LegendaSegment } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { instruction, analysis, transcription }: {
      instruction: string
      analysis: VideoAnalysis
      transcription: LegendaSegment[]
    } = await req.json()

    const systemPrompt = `Você é um editor de vídeo IA. O usuário vai pedir ajustes nas cenas do vídeo.
Você recebe a análise atual (JSON) e uma instrução em português, e retorna a análise ATUALIZADA.

Tipos de cena: A=FullScreen, B=LowerThird, C=Split, D=Comparativo, E=Card, F=Mensagem, G=Número, H=Fluxo, I=CTA, BONECO=Boneco

Regras:
- Mantenha o narrativeFormat e palette a menos que o usuário peça para mudar
- startLeg deve ser índice válido entre 0 e ${transcription.length - 1}
- durationLegs entre 1 e 3
- Preserve IDs das cenas que não foram alteradas
- Para cenas novas, gere um novo UUID como id
- Retorne APENAS o JSON válido da análise completa, sem markdown`

    const userMessage = `Instrução do usuário: "${instruction}"

Análise atual:
${JSON.stringify(analysis, null, 2)}

Transcrição (${transcription.length} segmentos):
${transcription.map((s, i) => `[${i}] ${s.text}`).join('\n')}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenAI erro ${response.status}: ${err}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('Resposta vazia')

    let updatedAnalysis: VideoAnalysis
    try {
      updatedAnalysis = JSON.parse(text)
    } catch {
      throw new Error('JSON inválido: ' + text.slice(0, 200))
    }

    updatedAnalysis.scenes = updatedAnalysis.scenes.map(s => ({ ...s, id: s.id || uuidv4() }))

    return NextResponse.json({ analysis: updatedAnalysis })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
