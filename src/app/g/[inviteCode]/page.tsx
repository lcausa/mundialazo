'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import type { Group } from '@/types'

type PageState = 'loading' | 'not_found' | 'ready' | 'full' | 'joined'

export default function JoinGroupPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const inviteCode = (params.inviteCode as string).toLowerCase()

  const [state, setState]       = useState<PageState>('loading')
  const [group, setGroup]       = useState<Group | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [isAlreadyMember, setIsAlreadyMember] = useState(false)
  const [joining, setJoining]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { loadGroup() }, [inviteCode])

  async function loadGroup() {
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .ilike('invite_code', inviteCode)
      .single()

    if (!groupData) {
      setState('not_found')
      return
    }

    setGroup(groupData)

    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupData.id)

    const currentCount = count ?? 0
    setMemberCount(currentCount)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupData.id)
        .eq('user_id', user.id)
        .single()

      if (membership) {
        setIsAlreadyMember(true)
        setState('joined')
        return
      }
    }

    if (currentCount >= groupData.max_members) {
      setState('full')
      return
    }

    setState('ready')
  }

  async function handleJoin() {
    if (!group) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?returnTo=/g/${inviteCode}`)
      return
    }

    setJoining(true)
    setError('')

    const { error: insertError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id:  user.id,
        role:     'member',
      })

    if (insertError) {
      if (insertError.code === '23505') {
        // ya era miembro, redirigir igual
        router.push(`/grupos/${group.id}`)
        return
      }
      setError('No se pudo unir al grupo. Intenta de nuevo.')
      setJoining(false)
      return
    }

    router.push(`/grupos/${group.id}`)
  }

  const color = group ? `#${group.primary_color}` : '#00A86B'

  // ── LOADING ──
  if (state === 'loading') {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl font-black" style={{ color }}>Cargando...</div>
      </main>
    )
  }

  // ── NOT FOUND ──
  if (state === 'not_found') {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-2xl font-black mb-2">Este grupo no existe</h1>
        <p className="text-gray-500 text-sm mb-8">
          El código de invitación no es válido o el grupo fue eliminado.
        </p>
        <a
          href="/"
          className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-bold hover:bg-white/20 transition"
        >
          ← Ir al inicio
        </a>
      </main>
    )
  }

  if (!group) return null

  // ── READY / FULL / JOINED ──
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo/Avatar del grupo */}
        <div className="flex justify-center mb-6">
          {group.logo_url ? (
            <img
              src={group.logo_url}
              alt={group.name}
              className="w-24 h-24 rounded-2xl object-cover border-2"
              style={{ borderColor: color }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black"
              style={{ backgroundColor: `${color}22`, border: `2px solid ${color}` }}
            >
              {group.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Nombre */}
        <h1 className="text-3xl font-black text-center mb-2">{group.name}</h1>

        {/* Descripción */}
        {group.description && (
          <p className="text-gray-400 text-sm text-center mb-4 leading-relaxed">
            {group.description}
          </p>
        )}

        {/* Miembros */}
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <div className="flex flex-col items-center">
            <span className="font-black text-xl">{memberCount}</span>
            <span className="text-gray-500 text-xs">
              {memberCount === 1 ? 'participante' : 'participantes'}
            </span>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="font-black text-xl">{group.max_members}</span>
            <span className="text-gray-500 text-xs">máximo</span>
          </div>
        </div>

        {/* Premio */}
        {group.prize_description && (
          <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
            <span>🏆</span>
            <span>{group.prize_description}</span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-6">
          {state === 'full' && (
            <div className="text-center">
              <div className="text-4xl mb-3">😔</div>
              <p className="font-bold mb-1">Grupo lleno</p>
              <p className="text-sm text-gray-500 mb-6">
                Este grupo ya alcanzó el máximo de {group.max_members} participantes.
              </p>
              <a
                href="/"
                className="block w-full py-3 border border-white/20 rounded-xl text-sm font-bold text-center hover:bg-white/10 transition"
              >
                ← Ir al inicio
              </a>
            </div>
          )}

          {state === 'joined' && (
            <button
              onClick={() => router.push(`/grupos/${group.id}`)}
              className="w-full py-4 rounded-xl font-black text-lg text-black transition"
              style={{ backgroundColor: color }}
            >
              Ir al grupo →
            </button>
          )}

          {state === 'ready' && (
            <>
              {error && (
                <p className="text-red-400 text-sm text-center mb-3">{error}</p>
              )}
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-4 rounded-xl font-black text-lg text-black transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: color }}
              >
                {joining ? 'Uniéndote...' : '⚽ Unirme al grupo'}
              </button>
              <p className="text-xs text-gray-600 text-center mt-3">
                Al unirte aceptas participar en este grupo mundialero
              </p>
            </>
          )}
        </div>

      </div>
    </main>
  )
}
