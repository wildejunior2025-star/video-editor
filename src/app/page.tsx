'use client'
import React, { useState, useRef } from 'react'
import { ProjectData, Scene } from '@/types'
import { recalcTimestamps } from '@/lib/recalcTimestamps'
import { UploadZone } from '@/components/UploadZone'
import { ProgressBar } from '@/components/ProgressBar'
import { SceneCard } from '@/components/SceneCard'
import { VideoPreview } from '@/components/VideoPreview'
import { AIChat } from '@/components/AIChat'
import { ManualCuts } from '@/components/ManualCuts'

const initialProject: Partial<ProjectData> = {
  status: 'uploading',
  progress: 0,
  message: 'Aguardando vídeo...',
}

export default function Home() {
  const [project, setProject] = useState<Partial<ProjectData>>(initialProject)
  const [prompt, setPrompt] = useState('')
  const [noiseReduction, setNoiseReduction] = useState(false)
  const [noiseLevel, setNoiseLevel] = useState<'leve' | 'medio' | 'forte'>('leve')
  const [estimatedSeconds, setEstimatedSeconds] = useState(0)
  const [editingScene, setEditingScene] = useState<Scene | null>(null)
  const [loading, setLoading] = useState(false)

  const updateProject = (updates: Partial<ProjectData>) =>
    setProject((p) => ({ ...p, ...updates }))

  const handleUpload = async (files: File[]) => {
    setLoading(true)
    const msg = files.length > 1 ? `Unindo ${files.length} vídeos...` : 'Enviando vídeo...'
    updateProject({ status: 'uploading', progress: 10, message: msg })

    // Estima tempo total: base 60s + 1s por MB + 30s se noise reduction
    const totalMB = files.reduce((sum, f) => sum + f.size / 1024 / 1024, 0)
    const estimate = Math.round(60 + totalMB * 1 + (noiseReduction ? 30 : 0))
    setEstimatedSeconds(estimate)

    try {
      // 1. Upload (um ou múltiplos)
      const formData = new FormData()
      files.forEach(f => formData.append('video', f))
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error)
      updateProject({ id: uploadData.id, originalVideo: uploadData.originalVideo, progress: 25, message: 'Normalizando vídeo...' })

      // 2. Converter formato (sem cortes ainda)
      const normRes1 = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uploadData.id, originalVideo: uploadData.originalVideo, noiseReduction, noiseLevel }),
      })
      const normData1 = await normRes1.json()
      const convertedVideo = normData1.normalizedVideo || uploadData.originalVideo
      updateProject({ normalizedVideo: convertedVideo, progress: 35, message: 'Transcrevendo áudio com Whisper...' })

      // 3. Transcrever
      const transRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uploadData.id, normalizedVideo: convertedVideo }),
      })
      const transData = await transRes.json()
      if (!transRes.ok) throw new Error(transData.error)
      updateProject({ transcription: transData.transcription, progress: 60, message: 'Cortando silêncios...' })

      // 4. Normalizar com corte de silêncios (usa a transcrição)
      const normRes2 = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uploadData.id, originalVideo: convertedVideo, transcription: transData.transcription }),
      })
      const normData2 = await normRes2.json()
      const normalizedVideo = normData2.normalizedVideo || convertedVideo

      // Recalcula timestamps se houve cortes
      const finalTranscription = normData2.speechIntervals
        ? recalcTimestamps(transData.transcription, normData2.speechIntervals)
        : transData.transcription

      updateProject({ normalizedVideo, transcription: finalTranscription, progress: 70, message: 'Analisando conteúdo com GPT-4o...' })

      // 4. Analisar
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription: transData.transcription, prompt }),
      })
      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) throw new Error(analyzeData.error)

      updateProject({
        analysis: analyzeData.analysis,
        status: 'ready',
        progress: 100,
        message: 'Pronto para revisão!',
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      updateProject({ status: 'error', message: `Erro: ${msg}` })
    } finally {
      setLoading(false)
    }
  }

  const handleRender = async () => {
    if (!project.id || !project.analysis) return
    setLoading(true)
    updateProject({ status: 'rendering', progress: 10, message: 'Iniciando renderização...' })

    const projectId = project.id

    // Poll progresso enquanto renderiza
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/render-progress/${projectId}`)
        const data = await res.json()
        const msgs: Record<string, string> = {
          starting: 'Iniciando renderização...',
          capturing: `Capturando frames... ${data.frame}/${data.total}`,
          compositing: 'Finalizando vídeo...',
        }
        updateProject({ progress: data.percent || 10, message: msgs[data.status] || 'Renderizando...' })
      } catch {}
    }, 1500)

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateProject({ outputVideo: data.outputVideo + '?t=' + Date.now(), status: 'done', progress: 100, message: '✅ Vídeo pronto para download!' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      updateProject({ status: 'ready', progress: 0, message: `Erro no render: ${msg.slice(0, 120)}` })
    } finally {
      clearInterval(pollInterval)
      setLoading(false)
    }
  }

  const saveSceneEdit = (updated: Scene) => {
    if (!project.analysis) return
    const scenes = project.analysis.scenes.map((s) => s.id === updated.id ? updated : s)
    updateProject({ analysis: { ...project.analysis, scenes } })
    setEditingScene(null)
  }

  const isReady = project.status === 'ready' || project.status === 'done'
  const isDone = project.status === 'done'

  return (
    <div style={{ minHeight: '100vh', background: '#050508', fontFamily: 'Sora, sans-serif' }}>
      {/* Header */}
      <header style={{
        padding: '20px 40px',
        borderBottom: '1px solid rgba(255,184,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(14,14,20,0.8)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🎬</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#FFB800' }}>VideoAI</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>Editor Automático</span>
        </div>
        {isReady && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Seletor de estilo de legenda */}
            <div style={{ display: 'flex', gap: 4 }}>
              {([['reveal','✨ Revelar'],['karaoke','🎤 Karaoke'],['classic','📝 Clássico']] as const).map(([style, label]) => (
                <button key={style} onClick={() => updateProject({ subtitleStyle: style })}
                  style={{
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    background: (project.subtitleStyle || 'reveal') === style ? 'rgba(255,184,0,0.25)' : 'rgba(255,255,255,0.06)',
                    color: (project.subtitleStyle || 'reveal') === style ? '#FFB800' : 'rgba(255,255,255,0.5)',
                    fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600,
                    outline: 'none',
                    borderWidth: 1, borderStyle: 'solid',
                    borderColor: (project.subtitleStyle || 'reveal') === style ? 'rgba(255,184,0,0.4)' : 'transparent',
                  }}>{label}</button>
              ))}
            </div>

            {/* Seletor de velocidade */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 1.25, 1.5, 1.75, 2].map(s => (
                <button
                  key={s}
                  onClick={() => updateProject({ speed: s })}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: (project.speed || 1) === s ? 'linear-gradient(135deg, #FFB800, #CC9200)' : 'rgba(255,255,255,0.08)',
                    color: (project.speed || 1) === s ? '#000' : 'rgba(255,255,255,0.6)',
                    fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >{s}x</button>
              ))}
            </div>
            <button
              onClick={handleRender}
              disabled={loading}
              style={{
                background: loading ? 'rgba(255,184,0,0.3)' : 'linear-gradient(135deg, #FFB800, #CC9200)',
                border: 'none', borderRadius: 12, padding: '12px 32px',
                fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700,
                color: loading ? 'rgba(0,0,0,0.5)' : '#000', cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '⏳ Renderizando...' : '🚀 Renderizar Vídeo'}
            </button>
          </div>
        )}
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 73px)' }}>
        {/* Coluna esquerda — upload / preview */}
        <div style={{ flex: '0 0 420px', padding: 32, borderRight: '1px solid rgba(255,184,0,0.08)', overflowY: 'auto' }}>
          {!isReady ? (
            <>
              <UploadZone onUpload={handleUpload} loading={loading} />

              {/* Prompt opcional */}
              <div style={{ marginTop: 24 }}>
                <label style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>
                  Prompt opcional (estilo, tom, foco)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Foco em gerar autoridade, tom direto, cores azuis..."
                  style={{
                    width: '100%', background: 'rgba(14,14,20,0.8)',
                    border: '1px solid rgba(255,184,0,0.2)', borderRadius: 12,
                    padding: '12px 16px', color: '#fff', resize: 'vertical',
                    fontFamily: 'Sora, sans-serif', fontSize: 14, minHeight: 80,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Opção de remoção de ruído */}
              <div style={{ marginBottom: 12 }}>
                <div
                  onClick={() => setNoiseReduction(n => !n)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: noiseReduction ? 'rgba(255,184,0,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${noiseReduction ? 'rgba(255,184,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: noiseReduction ? '10px 10px 0 0' : 10,
                    padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: noiseReduction ? 'linear-gradient(135deg, #FFB800, #CC9200)' : 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, flexShrink: 0,
                  }}>
                    {noiseReduction ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: noiseReduction ? '#FFB800' : 'rgba(255,255,255,0.7)' }}>
                      🎙️ Remover ruído de fundo
                    </div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                      Remove vozes e sons ao fundo do áudio
                    </div>
                  </div>
                </div>

                {/* Nível de intensidade */}
                {noiseReduction && (
                  <div style={{
                    display: 'flex', gap: 0,
                    border: '1px solid rgba(255,184,0,0.4)', borderTop: 'none',
                    borderRadius: '0 0 10px 10px', overflow: 'hidden',
                  }}>
                    {([
                      ['leve', '🟢 Leve', 'Preserva a voz, remove pouco ruído'],
                      ['medio', '🟡 Médio', 'Equilíbrio entre voz e ruído'],
                      ['forte', '🔴 Forte', 'Remove mais ruído, pode afetar voz'],
                    ] as const).map(([val, label, desc]) => (
                      <button
                        key={val}
                        onClick={() => setNoiseLevel(val)}
                        style={{
                          flex: 1, padding: '8px 6px', border: 'none',
                          background: noiseLevel === val ? 'rgba(255,184,0,0.15)' : 'rgba(255,255,255,0.03)',
                          borderRight: val !== 'forte' ? '1px solid rgba(255,184,0,0.2)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 700, color: noiseLevel === val ? '#FFB800' : 'rgba(255,255,255,0.5)' }}>{label}</div>
                        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {project.status !== 'uploading' || project.progress ? (
                <div style={{ marginTop: 20 }}>
                  <ProgressBar
                    progress={project.progress || 0}
                    message={project.message || ''}
                    status={project.status || 'uploading'}
                    estimatedSeconds={estimatedSeconds}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* Preview do vídeo — mostra output renderizado se disponível */}
              <div style={{ marginBottom: 20 }}>
                {isDone && project.outputVideo ? (
                  <div style={{ borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '9/16', position: 'relative' }}>
                    <video
                      key={project.outputVideo}
                      src={`/api/download/${project.id}?t=${Date.now()}`}
                      controls
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'rgba(255,184,0,0.9)', borderRadius: 8,
                      padding: '4px 10px', fontFamily: 'Sora,sans-serif',
                      fontSize: 11, fontWeight: 700, color: '#000',
                    }}>✅ Vídeo Final</div>
                  </div>
                ) : (
                  <VideoPreview
                    src={project.normalizedVideo ? project.normalizedVideo.replace('/uploads/', '/api/video/') : ''}
                    transcription={project.transcription || []}
                    scenes={project.analysis?.scenes || []}
                    accentColor={project.analysis?.palette?.accent || '#FFB800'}
                    primaryColor={project.analysis?.palette?.primary || '#1a1a2e'}
                    subtitleStyle={project.subtitleStyle || 'reveal'}
                  bgOpacity={project.analysis?.palette?.opacity ?? 0.88}
                  />
                )}
              </div>

              {/* Info + editor de paleta */}
              <div style={{
                background: 'rgba(14,14,20,0.8)', border: '1px solid rgba(255,184,0,0.15)',
                borderRadius: 12, padding: '16px 20px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, color: '#FFB800', fontWeight: 600, marginBottom: 12 }}>
                  Formato: {project.analysis?.narrativeFormat}
                </div>
                {/* Color pickers + opacidade */}
                {project.analysis?.palette && (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      {(['primary', 'secondary', 'accent'] as const).map((k) => (
                        <div key={k} style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'capitalize' }}>{k}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="color"
                              value={project.analysis!.palette[k]}
                              onChange={(e) => updateProject({
                                analysis: {
                                  ...project.analysis!,
                                  palette: { ...project.analysis!.palette, [k]: e.target.value }
                                }
                              })}
                              style={{ width: 32, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 2, background: 'rgba(255,255,255,0.1)' }}
                            />
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                              {project.analysis!.palette[k]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Slider de opacidade do fundo */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Opacidade do fundo</span>
                        <span style={{ fontSize: 11, color: '#FFB800', fontWeight: 600 }}>
                          {Math.round((project.analysis!.palette.opacity ?? 0.88) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10} max={100}
                        value={Math.round((project.analysis!.palette.opacity ?? 0.88) * 100)}
                        onChange={(e) => updateProject({
                          analysis: {
                            ...project.analysis!,
                            palette: { ...project.analysis!.palette, opacity: Number(e.target.value) / 100 }
                          }
                        })}
                        style={{ width: '100%', accentColor: '#FFB800' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Transparente</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Sólido</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Baixar sem edição — disponível assim que processa */}
              {project.normalizedVideo && project.id && (
                <a
                  href={`/api/download-original/${project.id}?t=${Date.now()}`}
                  download="video-original.mp4"
                  style={{
                    display: 'block', textAlign: 'center',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12, padding: '11px 24px',
                    fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600,
                    color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: 10,
                  }}
                >
                  ⬇️ Baixar sem edição
                </a>
              )}

              {/* Cortes manuais */}
              {!isDone && project.normalizedVideo && (
                <ManualCuts
                  videoSrc={project.normalizedVideo.replace('/uploads/', '/api/video/')}
                  cuts={project.manualCuts || []}
                  onCutsChange={(cuts) => updateProject({ manualCuts: cuts })}
                />
              )}

              {isDone && project.id && (
                <a
                  href={`/api/download/${project.id}?t=${Date.now()}`}
                  download="video-editado.mp4"
                  style={{
                    display: 'block', textAlign: 'center',
                    background: 'linear-gradient(135deg, #FFB800, #CC9200)',
                    borderRadius: 12, padding: '14px 24px',
                    fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700,
                    color: '#000', textDecoration: 'none', marginBottom: 16,
                  }}
                >
                  ⬇️ Baixar Vídeo Editado
                </a>
              )}
            </>
          )}
        </div>

        {/* Coluna central — lista de cenas */}
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {isReady && project.analysis ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
                  Cenas ({project.analysis.scenes.length})
                </h2>
                <button
                  onClick={() => {
                    const { v4: uuidv4 } = require('uuid')
                    const newScene = {
                      id: uuidv4(),
                      type: 'E' as const,
                      startLeg: 0,
                      durationLegs: 2,
                      title: 'Nova Cena',
                      subtitle: '',
                    }
                    updateProject({ analysis: { ...project.analysis!, scenes: [...project.analysis!.scenes, newScene] } })
                    setEditingScene(newScene)
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #FFB800, #CC9200)',
                    border: 'none', borderRadius: 10, padding: '8px 16px',
                    fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700,
                    color: '#000', cursor: 'pointer',
                  }}
                >
                  + Nova Cena
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {project.analysis.scenes.map((scene, i) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    index={i}
                    transcription={project.transcription || []}
                    onEdit={setEditingScene}
                    onOffsetChange={(id, delta) => {
                      const scenes = project.analysis!.scenes.map(s =>
                        s.id === id
                          ? { ...s, timeOffset: Math.round(((s.timeOffset || 0) + delta) * 10) / 10 }
                          : s
                      )
                      updateProject({ analysis: { ...project.analysis!, scenes } })
                    }}
                    onDelete={(id) => {
                      const scenes = project.analysis!.scenes.filter(s => s.id !== id)
                      updateProject({ analysis: { ...project.analysis!, scenes } })
                    }}
                  />
                ))}
              </div>

              {/* Timeline */}
              <div style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                  TIMELINE
                </h3>
                <div style={{
                  height: 48, background: 'rgba(14,14,20,0.8)',
                  borderRadius: 8, position: 'relative', overflow: 'hidden',
                  border: '1px solid rgba(255,184,0,0.1)',
                }}>
                  {project.analysis.scenes.map((scene, i) => {
                    const total = project.transcription?.length || 1
                    const left = (scene.startLeg / total) * 100
                    const width = (scene.durationLegs / total) * 100
                    return (
                      <div key={scene.id} title={`${scene.type}: ${scene.title || ''}`} style={{
                        position: 'absolute', top: 6, bottom: 6,
                        left: `${left}%`, width: `${Math.max(width, 1)}%`,
                        background: `hsl(${(i * 47) % 360}, 70%, 55%)`,
                        borderRadius: 4, opacity: 0.8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff',
                        overflow: 'hidden',
                      }}>
                        {scene.type}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>✨</div>
                <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 16 }}>
                  As cenas aparecerão aqui após o processamento
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat IA flutuante */}
      {isReady && project.analysis && (
        <AIChat
          analysis={project.analysis}
          transcription={project.transcription || []}
          onUpdate={(newAnalysis) => updateProject({ analysis: newAnalysis })}
        />
      )}

      {/* Modal de edição de cena */}
      {editingScene && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}
          onClick={() => setEditingScene(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0e0e14', border: '1px solid rgba(255,184,0,0.2)',
              borderRadius: 20, padding: 32, width: 480, maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#FFB800', marginTop: 0, marginBottom: 16 }}>
              Editar Cena
            </h3>

            {/* Seletor de tipo */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>
                Tipo de cena
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {([
                  ['A', 'Tela Cheia'],
                  ['B', 'Barra Baixo'],
                  ['C', 'Split Cima'],
                  ['D', 'Comparativo'],
                  ['E', 'Card'],
                  ['F', 'Mensagem'],
                  ['G', 'Número'],
                  ['H', 'Fluxo'],
                  ['I', 'CTA'],
                  ['BONECO', 'Boneco'],
                ] as const).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => setEditingScene({ ...editingScene, type })}
                    style={{
                      padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600,
                      background: editingScene.type === type
                        ? 'linear-gradient(135deg, #FFB800, #CC9200)'
                        : 'rgba(255,255,255,0.07)',
                      color: editingScene.type === type ? '#000' : 'rgba(255,255,255,0.6)',
                      outline: 'none',
                      borderWidth: 1, borderStyle: 'solid',
                      borderColor: editingScene.type === type ? 'transparent' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>{type}</span> · {label}
                  </button>
                ))}
              </div>
            </div>

            {(['title', 'subtitle', 'body', 'number'] as const).map((field) => (
              editingScene[field] !== undefined || field === 'title' ? (
                <div key={field} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                      {field}
                    </label>
                    {field === 'title' && (
                      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, color: 'rgba(255,184,0,0.5)' }}>
                        Enter = quebra linha
                      </span>
                    )}
                  </div>
                  {field === 'title' || field === 'body' ? (
                    <textarea
                      value={editingScene[field] || ''}
                      onChange={(e) => setEditingScene({ ...editingScene, [field]: e.target.value })}
                      rows={field === 'title' ? 3 : 2}
                      style={{
                        width: '100%', background: 'rgba(5,5,8,0.8)',
                        border: '1px solid rgba(255,184,0,0.2)', borderRadius: 8,
                        padding: '10px 14px', color: '#fff',
                        fontFamily: 'Sora, sans-serif', fontSize: 14, outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  ) : (
                    <input
                      value={editingScene[field] || ''}
                      onChange={(e) => setEditingScene({ ...editingScene, [field]: e.target.value })}
                      style={{
                        width: '100%', background: 'rgba(5,5,8,0.8)',
                        border: '1px solid rgba(255,184,0,0.2)', borderRadius: 8,
                        padding: '10px 14px', color: '#fff',
                        fontFamily: 'Sora, sans-serif', fontSize: 14, outline: 'none',
                      }}
                    />
                  )}
                </div>
              ) : null
            ))}

            {/* Cores */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  Cor do texto
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={editingScene.textColor || '#ffffff'}
                    onChange={(e) => setEditingScene({ ...editingScene, textColor: e.target.value })}
                    style={{ width: 40, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    value={editingScene.textColor || '#ffffff'}
                    onChange={(e) => setEditingScene({ ...editingScene, textColor: e.target.value })}
                    style={{ flex: 1, background: 'rgba(5,5,8,0.8)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  Cor do fundo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={editingScene.bgColor || '#050508'}
                    onChange={(e) => setEditingScene({ ...editingScene, bgColor: e.target.value })}
                    style={{ width: 40, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    value={editingScene.bgColor || ''}
                    onChange={(e) => setEditingScene({ ...editingScene, bgColor: e.target.value })}
                    placeholder="auto"
                    style={{ flex: 1, background: 'rgba(5,5,8,0.8)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Tamanho da fonte */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>
                Tamanho da fonte — {editingScene.fontSize || (editingScene.type === 'G' ? 110 : 32)}px
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setEditingScene({ ...editingScene, fontSize: Math.max(12, (editingScene.fontSize || (editingScene.type === 'G' ? 110 : 32)) - 4) })}
                  style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>−</button>
                <input
                  type="range"
                  min={10} max={200}
                  value={editingScene.fontSize || (editingScene.type === 'G' ? 110 : 32)}
                  onChange={(e) => setEditingScene({ ...editingScene, fontSize: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: '#FFB800' }}
                />
                <button onClick={() => setEditingScene({ ...editingScene, fontSize: Math.min(200, (editingScene.fontSize || (editingScene.type === 'G' ? 110 : 32)) + 4) })}
                  style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>+</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => saveSceneEdit(editingScene)}
                style={{
                  flex: 1, background: 'linear-gradient(135deg, #FFB800, #CC9200)',
                  border: 'none', borderRadius: 10, padding: '12px 0',
                  fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700,
                  color: '#000', cursor: 'pointer',
                }}
              >
                Salvar
              </button>
              <button
                onClick={() => setEditingScene(null)}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                  padding: '12px 0', fontFamily: 'Sora, sans-serif',
                  fontSize: 14, color: '#fff', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
