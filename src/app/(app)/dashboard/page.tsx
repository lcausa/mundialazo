'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Group, User } from '@/types'

interface GroupWithMeta extends Group {
  memberCount: number
  myPosition:  number | null
  myPoints:    number
}

const LEVEL_LABELS: Record<string, string> = {
  novato:  'Novato',
  hincha:  'Hincha',
  guru:    'Gurú',
  chaman:  'Chamán',
  leyenda: 'Leyenda',
}

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [profile, setProfile]   = useState<User | null>(null)
  const [groups,  setGroups]    = useState<GroupWithMeta[]>([])
  const [loading, setLoading]   = useState(true)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { router.replace('/login'); return }

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) console.error('[dashboard] profileError:', profileError)
    if (!profileData) { router.replace('/onboarding'); return }
    setProfile(profileData as User)

    // Single query: group_members joined with groups
    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id, points, group:groups(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    console.log('[dashboard] memberships raw:', memberships, 'error:', memberError)

    if (memberError) {
      console.error('[dashboard] memberError:', memberError)
      setDebugInfo(`Error RLS/query: ${memberError.message} (code: ${memberError.code})`)
    }
    if (!memberships?.length) { setLoading(false); return }

    // Enrich with member count and rank
    const enriched = await Promise.all(
      memberships.map(async (m: { group_id: string; points: number; group: unknown }) => {
        const g = m.group as Group
        if (!g) return null

        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)

        const myPts = m.points ?? 0
        const { count: above } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)
          .gt('points', myPts)

        return {
          ...g,
          memberCount: count ?? 0,
          myPosition:  above !== null ? above + 1 : null,
          myPoints:    myPts,
        } as GroupWithMeta
      })
    )

    const filtered = enriched.filter((g): g is GroupWithMeta => g !== null)
    console.log('[dashboard] Grupos cargados:', filtered)
    setGroups(filtered)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl font-black text-[#00A86B]">Cargando...</div>
      </main>
    )
  }

  if (!profile) return null

  return (
    <main className="min-h-screen bg-black text-white pb-16">

      {/* HEADER */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
              {profile.avatar_url || '⚽'}
            </div>
            <div>
              <div className="font-black text-sm leading-tight">
                {profile.alias || profile.name}
              </div>
              <div className="text-xs text-[#00A86B] font-bold">
                {LEVEL_LABELS[profile.level] ?? profile.level}
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-gray-500 hover:text-gray-300 transition px-3 py-1.5 border border-white/10 rounded-lg"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Mis grupos</h1>
          <button
            onClick={() => router.push('/grupos/nuevo')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00A86B] text-black text-sm font-bold rounded-xl hover:bg-[#007A4D] transition"
          >
            + Nuevo grupo
          </button>
        </div>

        {/* EMPTY STATE */}
        {groups.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="text-6xl">⚽</div>
            <div className="font-black text-xl">Aún no tienes grupos</div>
            <p className="text-gray-500 text-sm max-w-xs">
              Crea tu primera polla mundialera e invita a tus amigos por WhatsApp.
            </p>
            {debugInfo && (
              <div className="mt-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 max-w-xs text-left">
                <strong>Debug:</strong> {debugInfo}
              </div>
            )}
            <button
              onClick={() => router.push('/grupos/nuevo')}
              className="mt-2 px-8 py-4 bg-[#00A86B] text-black font-bold text-lg rounded-xl hover:bg-[#007A4D] transition"
            >
              Crear mi grupo →
            </button>
          </div>
        )}

        {/* GROUP CARDS */}
        {groups.map(g => {
          const color = `#${g.primary_color}`
          return (
            <div
              key={g.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:border-white/20 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Color badge */}
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-lg text-black"
                    style={{ backgroundColor: color }}
                  >
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-base leading-tight truncate">{g.name}</div>
                    {g.description && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">{g.description}</div>
                    )}
                  </div>
                </div>

                {/* Rank badge */}
                {g.myPosition !== null && (
                  <div
                    className="flex-shrink-0 text-center px-3 py-1.5 rounded-xl"
                    style={{ backgroundColor: `${color}22` }}
                  >
                    <div className="font-black text-lg leading-none" style={{ color }}>
                      #{g.myPosition}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{g.myPoints} pts</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {g.memberCount} {g.memberCount === 1 ? 'participante' : 'participantes'}
                </span>
                {g.prize_description && (
                  <span className="text-xs text-gray-400">🏆 {g.prize_description}</span>
                )}
              </div>

              <button
                onClick={() => router.push(`/grupos/${g.id}`)}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-black transition hover:brightness-110"
                style={{ backgroundColor: color }}
              >
                Entrar al grupo →
              </button>
            </div>
          )
        })}

      </div>
    </main>
  )
}
