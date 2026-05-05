'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? ''

  async function sendMagicLink() {
    if (!email) return
    setLoading(true)
    setError('')
    const redirectPath = returnTo
      ? `/onboarding?returnTo=${encodeURIComponent(returnTo)}`
      : '/onboarding'
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}${redirectPath}`,
      }
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      <div className="text-4xl font-black text-[#00A86B] mb-2 tracking-wider">
        MUNDIALAZO
      </div>
      <p className="text-gray-500 text-sm mb-12">La polla del grupo en 30 segundos</p>

      <div className="w-full max-w-sm">
        {!sent ? (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xl font-bold mb-1">Ingresa tu email</div>
              <div className="text-sm text-gray-400 mb-6">
                Te enviamos un link mágico para entrar. Sin contraseña.
              </div>
            </div>

            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B] transition"
            />

            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}

            <button
              onClick={sendMagicLink}
              disabled={loading || !email}
              className="w-full py-3 bg-[#00A86B] text-black font-bold rounded-xl hover:bg-[#007A4D] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar link mágico →'}
            </button>
          </div>

        ) : (
          <div className="text-center flex flex-col gap-4">
            <div className="text-5xl mb-4">📬</div>
            <div className="text-xl font-bold">Revisa tu email</div>
            <div className="text-sm text-gray-400 leading-relaxed">
              Enviamos un link a <span className="text-white">{email}</span>.<br />
              Haz clic en el link para entrar.
            </div>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-sm text-gray-500 hover:text-gray-300 transition mt-4"
            >
              ← Usar otro email
            </button>
          </div>
        )}
      </div>
    </main>
  )
}