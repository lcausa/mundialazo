'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const AVATARS = ['⚽', '🏆', '🤖', '🦁', '🔥', '⚡', '🎯', '👑']

const TEAMS = [
  'Argentina', 'Brasil', 'Uruguay', 'Colombia',
  'Ecuador', 'Venezuela', 'Perú', 'Bolivia',
  'España', 'Francia', 'Alemania', 'Inglaterra',
  'Portugal', 'Italia', 'Países Bajos', 'Bélgica',
  'México', 'Estados Unidos', 'Canadá',
  'Marruecos', 'Senegal', 'Nigeria',
  'Japón', 'Corea del Sur', 'Australia',
  'Otro'
]

function OnboardingForm() {
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [avatar, setAvatar] = useState('⚽')
  const [team, setTeam] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? ''

  async function saveProfile() {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      name: name.trim(),
      alias: alias.trim() || name.trim(),
      avatar_url: avatar,
      favorite_team: team,
      level: 'novato',
      xp: 0,
    })

    if (error) {
      setError('Error al guardar. Intenta de nuevo.')
      console.error(error)
    } else {
      router.push(returnTo || '/grupos/nuevo')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      <div className="text-4xl font-black text-[#00A86B] mb-2 tracking-wider">
        MUNDIALAZO
      </div>
      <p className="text-gray-500 text-sm mb-10">Crea tu perfil mundialero</p>

      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* AVATAR */}
        <div>
          <div className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
            Elige tu avatar
          </div>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`text-2xl p-2 rounded-lg border transition ${
                  avatar === a
                    ? 'border-[#00A86B] bg-[#00A86B]/20'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* NOMBRE */}
        <div>
          <div className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
            Tu nombre
          </div>
          <input
            type="text"
            placeholder="Ej: Leonardo"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B] transition"
          />
        </div>

        {/* ALIAS */}
        <div>
          <div className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
            Alias en la polla <span className="text-gray-600 normal-case font-normal">(opcional)</span>
          </div>
          <input
            type="text"
            placeholder="Ej: ElGurú, Mister10, etc."
            value={alias}
            onChange={e => setAlias(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B] transition"
          />
        </div>

        {/* EQUIPO FAVORITO */}
        <div>
          <div className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
            Tu selección favorita
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TEAMS.map(t => (
              <button
                key={t}
                onClick={() => setTeam(t)}
                className={`py-2 px-3 text-sm rounded-lg border transition ${
                  team === t
                    ? 'border-[#00A86B] bg-[#00A86B]/20 text-white font-bold'
                    : 'border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        <button
          onClick={saveProfile}
          disabled={loading || !name.trim()}
          className="w-full py-4 bg-[#00A86B] text-black font-bold text-lg rounded-xl hover:bg-[#007A4D] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Entrar al Mundialazo →'}
        </button>

      </div>
    </main>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <OnboardingForm />
    </Suspense>
  )
}