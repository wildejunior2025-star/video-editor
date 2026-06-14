'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Conta criada! Verifique seu email para confirmar.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(msg === 'Invalid login credentials' ? 'Email ou senha incorretos.' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050508',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Sora, sans-serif', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'rgba(14,14,20,0.9)',
        border: '1px solid rgba(255,184,0,0.15)',
        borderRadius: 24, padding: 40,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 40 }}>🎬</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#FFB800', marginTop: 8 }}>VideoAI</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Editor Automático</div>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.05)',
          borderRadius: 12, padding: 4, marginBottom: 28,
        }}>
          {(['login', 'signup'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
                background: mode === m ? 'linear-gradient(135deg, #FFB800, #CC9200)' : 'transparent',
                color: mode === m ? '#000' : 'rgba(255,255,255,0.5)',
                fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required
              style={{
                width: '100%', background: 'rgba(5,5,8,0.8)',
                border: '1px solid rgba(255,184,0,0.2)', borderRadius: 10,
                padding: '12px 14px', color: '#fff',
                fontFamily: 'Sora, sans-serif', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Senha</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
              style={{
                width: '100%', background: 'rgba(5,5,8,0.8)',
                border: '1px solid rgba(255,184,0,0.2)', borderRadius: 10,
                padding: '12px 14px', color: '#fff',
                fontFamily: 'Sora, sans-serif', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: '#ff6b6b', fontSize: 13,
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: '#4caf50', fontSize: 13,
            }}>{success}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px 0',
            background: loading ? 'rgba(255,184,0,0.3)' : 'linear-gradient(135deg, #FFB800, #CC9200)',
            border: 'none', borderRadius: 12,
            fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700,
            color: loading ? 'rgba(0,0,0,0.4)' : '#000', cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
