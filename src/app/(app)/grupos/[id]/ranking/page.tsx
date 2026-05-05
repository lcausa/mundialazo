'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import type { Group, GroupMember } from '@/types'

const LEVEL_LABELS: Record<string, string> = {
  novato:  'Novato',
  hincha:  'Hincha',
  guru:    'Gurú',
  chaman:  'Chamán',
  leyenda: 'Leyenda',
}

export default function RankingPage() {
  const supabase = createClient()
  const params   = useParams()
  const router   = useRouter()
  const groupId  = params.id as string

  const [group,   setGroup]   = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [myId,    setMyId]    = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Track previous positions for animation
  const prevPositions = useRef<Record<string, number>>({})

  useEffect(() => {
    init()
    return () => { /* channel cleanup handled inside */ }
  }, [groupId])

  async function loadMembers(): Promise<GroupMember[]> {
    const { data } = await supabase
      .from('group_members')
      .select('*, user:users(*)')
      .eq('group_id', groupId)
      .order('points',     { ascending: false })
      .order('exact_hits', { ascending: false })
    return (data as GroupMember[]) || []
  }

  async function init() {
    const [{ data: groupData }, { data: { user } }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase.auth.getUser(),
    ])

    if (!groupData) { router.push('/'); return }
    setGroup(groupData)
    setMyId(user?.id ?? null)

    const list = await loadMembers()
    setMembers(list)
    setLoading(false)

    // Realtime subscription
    const channel = supabase
      .channel('ranking-' + groupId)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        async () => {
          const updated = await loadMembers()
          setMembers(prev => {
            // Snapshot positions before update
            const snap: Record<string, number> = {}
            prev.forEach((m, i) => { snap[m.user_id] = i })
            prevPositions.current = snap
            return updated
          })
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }

  function sharePosition() {
    if (!group || !myId) return
    const myIndex = members.findIndex(m => m.user_id === myId)
    if (myIndex === -1) return
    const me = members[myIndex]
    const inviteUrl = `${window.location.origin}/g/${group.invite_code}`
    const text = encodeURIComponent(
      `Voy en el lugar ${myIndex + 1} de la polla "${group.name}" con ${me.points} puntos. ¡Únete: ${inviteUrl}!`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const color = group ? `#${group.primary_color}` : '#00A86B'

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl font-black" style={{ color }}>Cargando...</div>
      </main>
    )
  }

  if (!group) return null

  const myPosition = members.findIndex(m => m.user_id === myId)

  return (
    <main className="min-h-screen bg-black text-white pb-16">

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-black border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(`/grupos/${groupId}`)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
          >
            ← Volver
          </button>
          <div className="text-xs text-gray-500">
            {members.length} {members.length === 1 ? 'participante' : 'participantes'}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* TÍTULO */}
        <div className="mb-2">
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color }}>
            Ranking
          </div>
          <h1 className="text-3xl font-black">{group.name}</h1>
        </div>

        {/* MI POSICIÓN + COMPARTIR */}
        {myId && myPosition !== -1 && (
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-6 mt-4">
            <div className="text-sm text-gray-400">
              Estás en el{' '}
              <span className="font-black text-white text-base">
                #{myPosition + 1}
              </span>{' '}
              con{' '}
              <span className="font-black" style={{ color }}>
                {members[myPosition].points} pts
              </span>
            </div>
            <button
              onClick={sharePosition}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-black text-xs font-bold rounded-xl hover:bg-[#20B558] transition"
            >
              <span>📲</span> Compartir
            </button>
          </div>
        )}

        {/* INVITE NUDGE */}
        {members.length < 3 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-6 text-sm text-gray-400 text-center">
            ¡Invita más gente al grupo para que la competencia sea más emocionante! 🔥
          </div>
        )}

        {/* LISTA */}
        <div className="flex flex-col gap-3">
          {members.map((member, index) => {
            const isMe    = member.user_id === myId
            const prevPos = prevPositions.current[member.user_id]
            const moved   = prevPos !== undefined && prevPos !== index

            return (
              <div
                key={member.user_id}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-500 ${
                  isMe
                    ? 'border-[#00A86B] bg-[#00A86B]/10'
                    : moved
                    ? 'border-white/20 bg-white/8'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {/* Posición */}
                <div className="w-8 text-center flex-shrink-0">
                  {index === 0 ? (
                    <span className="text-2xl">🥇</span>
                  ) : index === 1 ? (
                    <span className="text-2xl">🥈</span>
                  ) : index === 2 ? (
                    <span className="text-2xl">🥉</span>
                  ) : (
                    <span className="text-base font-black text-gray-500">{index + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="text-2xl flex-shrink-0">
                  {member.user?.avatar_url || '⚽'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm truncate">
                      {member.user?.alias || member.user?.name || 'Jugador'}
                    </span>
                    {member.user?.level && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border font-bold flex-shrink-0"
                        style={{ borderColor: `${color}66`, color }}
                      >
                        {LEVEL_LABELS[member.user.level] ?? member.user.level}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                    <span>{member.exact_hits} exactos</span>
                    <span>{member.winner_hits} ganador</span>
                    {member.streak_days > 0 && (
                      <span>🔥 {member.streak_days}</span>
                    )}
                  </div>
                </div>

                {/* Puntos */}
                <div
                  className="text-2xl font-black flex-shrink-0"
                  style={{ color: isMe ? color : 'white' }}
                >
                  {member.points}
                </div>
              </div>
            )
          })}
        </div>

        {members.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            Aún no hay participantes en este grupo.
          </div>
        )}

      </div>
    </main>
  )
}
