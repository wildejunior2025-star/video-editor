import { NextRequest, NextResponse } from 'next/server'
import { LegendaSegment, VideoAnalysis } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { transcription, prompt }: { transcription: LegendaSegment[]; prompt?: string } = await req.json()

    const fullText = transcription.map((s, i) => `[${i}] (${s.start.toFixed(1)}s) ${s.text}`).join('\n')

    const systemPrompt = `Você é um editor de vídeo especialista em conteúdo para redes sociais (Reels, TikTok, Shorts).
Analise a transcrição e retorne um JSON com:
- narrativeFormat: tipo narrativo (hook-revelação, lista, storytelling, tutorial, comparação, resultado, autoridade)
- palette: { primary, secondary, accent } em hex
- scenes: array de cenas visuais

Tipos de cena disponíveis:
A = FullScreen (frase de impacto, tela cheia)
B = LowerThird (rosto + texto embaixo)
E = Card (card numerado com ícone)
G = Number (número animado em destaque)
I = CTA (call to action)

Cada cena deve ter:
- id: string uuid
- type: tipo da cena (A, B, E, G ou I)
- startLeg: ÍNDICE do segmento de legenda onde começa (inteiro entre 0 e ${transcription.length - 1})
- durationLegs: quantos segmentos dura (mínimo 1, máximo 3) — mantenha curto para não cobrir demais a fala
- title: texto principal
- subtitle: texto secundário (opcional)
- body: corpo do texto (opcional)
- color: cor hex (opcional)
- icon: emoji (opcional, para tipo E)
- number: número em destaque (obrigatório para tipo G)

REGRAS DE TIMING — essencial para sincronização perfeita:
- startLeg = índice do segmento onde a pessoa COMEÇA A FALAR sobre aquele assunto
- Os timestamps (Xs) ao lado de cada segmento mostram quando ele ocorre no vídeo
- Coloque a cena EXATAMENTE quando a fala relevante começa
- durationLegs entre 1 e 2 (cenas curtas sincronizam melhor)
- Distribua as cenas ao longo de todo o vídeo (início, meio e fim)
Retorne APENAS o JSON válido, sem markdown, sem explicações.`

    const userMessage = `${prompt ? `Instruções adicionais: ${prompt}\n\n` : ''}Transcrição numerada:\n${fullText}`

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
      const errText = await response.text()
      throw new Error(`OpenAI API erro ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('Resposta vazia do GPT-4o')

    let analysis: VideoAnalysis
    try {
      analysis = JSON.parse(text)
    } catch {
      throw new Error('GPT-4o retornou JSON inválido: ' + text.slice(0, 300))
    }

    // Garante que todos os campos de texto são strings (GPT às vezes retorna números)
    analysis.scenes = analysis.scenes.map((s) => ({
      ...s,
      id: s.id || uuidv4(),
      title: s.title != null ? String(s.title) : undefined,
      subtitle: s.subtitle != null ? String(s.subtitle) : undefined,
      body: s.body != null ? String(s.body) : undefined,
      number: s.number != null ? String(s.number) : undefined,
    }))

    return NextResponse.json({ analysis })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[analyze error]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
