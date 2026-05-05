'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import type { Group, GroupMember } from '@/types'

export default function GrupoDashboard() {
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  useEffect(() => {
    loadGroup()
  }, [groupId])

  async function loadGroup() {
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (!groupData) {
      router.push('/')
      return
    }

    setGroup(groupData)

    const { data: membersData } = await supabase
      .from('group_members')
      .select('*, user:users(*)')
      .eq('group_id', groupId)
      .order('points', { ascending: false })

    setMembers(membersData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-[#00A86B] text-xl font-bold">Cargando...</div>
      </main>
    )
  }

  if (!group) return null

  const color = `#${group.primary_color}`
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/g/${group.invite_code}`
  const waText = encodeURIComponent(`¡Únete a mi polla mundialera "${group.name}"! 🏆⚽\n\nEntra acá: ${inviteUrl}`)

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span
          className="text-2xl font-black tracking-wider cursor-pointer"
          style={{ color }}
          onClick={() => router.push('/')}
        >
          MUNDIALAZO
        </span>
        <div className="text-sm text-gray-400">
          {members.length} participante{members.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* INFO GRUPO */}
        <div className="mb-8">
          <div
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color }}
          >
            Tu grupo
          </div>
          <h1 className="text-4xl font-black mb-2">{group.name}</h1>
          {group.description && (
            <p className="text-gray-400 text-sm">{group.description}</p>
          )}
          {group.prize_description && (
            <div className="mt-3 inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              🏆 {group.prize_description}
            </div>
          )}
        </div>

        {/* INVITAR */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="text-sm font-bold mb-1">Invita a tu grupo</div>
          <div className="text-xs text-gray-500 mb-4">
            Comparte el link o el código
          </div>

          {/* CÓDIGO */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-black border border-white/20 rounded-xl px-4 py-3 font-mono text-lg font-bold tracking-widest text-center"
              style={{ color }}
            >
              {group.invite_code.toUpperCase()}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(group.invite_code.toUpperCase())}
              className="px-4 py-3 border border-white/20 rounded-xl text-sm hover:bg-white/10 transition"
            >
              Copiar
            </button>
          </div>

          {/* BOTÓN WHATSAPP */}
          <a
            href={"https://wa.me/?text=" + waText}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-black font-bold rounded-xl hover:bg-[#20B558] transition"
          >
            <span>📲</span>
            Invitar por WhatsApp
          </a>
        </div>

        {/* RANKING */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="font-bold">🏆 Ranking</div>
            <div className="text-xs text-gray-500">Actualizado en tiempo real</div>
          </div>

          {members.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500 text-sm">
              Aún no hay participantes.<br />¡Invita a tus amigos!
            </div>
          ) : (
            <div>
              {members.map((m, i) => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-4 px-6 py-4 border-b border-white/5 last:border-0"
                >
                  <div className={`text-xl font-black w-8 text-center ${
                    i === 0 ? 'text-yellow-400' :
                    i === 1 ? 'text-gray-400' :
                    i === 2 ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div className="text-2xl">
                    {m.user?.avatar_url || '⚽'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">
                      {m.user?.alias || m.user?.name || 'Jugador'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {m.exact_hits} exactos · Nivel {m.user?.level || 'novato'}
                    </div>
                  </div>
                  <div
                    className="text-2xl font-black"
                    style={{ color }}
                  >
                    {m.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACCIONES */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push(`/grupos/${groupId}/pronosticos`)}
            className="py-4 font-bold rounded-xl border border-white/20 hover:bg-white/10 transition text-sm"
          >
            ⚽ Pronosticar
          </button>
          <button
            onClick={() => router.push(`/grupos/${groupId}/ranking`)}
            className="py-4 font-bold rounded-xl border border-white/20 hover:bg-white/10 transition text-sm"
          >
            🏆 Ranking completo
          </button>
          <button
            onClick={() => router.push(`/grupos/${groupId}/info`)}
            className="py-4 font-bold rounded-xl border border-white/20 hover:bg-white/10 transition text-sm col-span-2"
          >
            📋 Reglamento e Info
          </button>
        </div>

      </div>
    </main>
  )
}