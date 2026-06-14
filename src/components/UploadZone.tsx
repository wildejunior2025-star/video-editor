'use client'
import React, { useRef, useState } from 'react'

interface Props {
  onUpload: (files: File[]) => void
  loading: boolean
}

export const UploadZone: React.FC<Props> = ({ onUpload, loading }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleFiles = (files: File[]) => {
    const videos = files.filter(f => f.type.startsWith('video/')).slice(0, 4)
    if (videos.length > 0) setSelectedFiles(videos)
  }

  const handleStart = () => {
    if (selectedFiles.length > 0) onUpload(selectedFiles)
  }

  const removeFile = (i: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false)
          handleFiles(Array.from(e.dataTransfer.files))
        }}
        style={{
          border: `2px dashed ${dragging ? '#FFB800' : 'rgba(255,184,0,0.3)'}`,
          borderRadius: 20,
          padding: selectedFiles.length ? '24px 20px' : '60px 20px',
          textAlign: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: dragging ? 'rgba(255,184,0,0.05)' : 'rgba(14,14,20,0.7)',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
        />

        {selectedFiles.length === 0 ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              Solte seu(s) vídeo(s) aqui
            </h2>
            <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Até 4 vídeos — MP4, MOV, HEVC
            </p>
          </>
        ) : (
          <div>
            <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: '#FFB800', marginBottom: 10, fontWeight: 600 }}>
              {selectedFiles.length} vídeo{selectedFiles.length > 1 ? 's' : ''} selecionado{selectedFiles.length > 1 ? 's' : ''} — clique para adicionar mais
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedFiles.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)',
                  borderRadius: 10, padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: '#FFB800', color: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: '#fff', textAlign: 'left', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.7)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && !loading && (
        <button
          onClick={handleStart}
          style={{
            width: '100%', marginTop: 12,
            background: 'linear-gradient(135deg, #FFB800, #CC9200)',
            border: 'none', borderRadius: 12, padding: '14px 0',
            fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700,
            color: '#000', cursor: 'pointer',
          }}
        >
          {selectedFiles.length > 1 ? `🎬 Unir ${selectedFiles.length} vídeos e processar` : '🚀 Processar vídeo'}
        </button>
      )}
    </div>
  )
}
