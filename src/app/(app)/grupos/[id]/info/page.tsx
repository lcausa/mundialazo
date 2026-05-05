'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Group } from '@/types'

const POINT_RULES = [
  { icon: '🎯', label: 'Marcador exacto',                     pts: '+5 pts' },
  { icon: '✅', label: 'Ganador correcto',                    pts: '+3 pts' },
  { icon: '↔️', label: 'Diferencia correcta (sin marcar exacto)', pts: '+2 pts' },
  { icon: '⚽', label: 'Cada gol individual correcto',         pts: '+1 pt'  },
  { icon: '🟥', label: 'Mini-desafío: Tarjeta roja (sí/no)',  pts: '+3 pts' },
  { icon: '📺', label: 'Mini-desafío: VAR decisivo (sí/no)',  pts: '+2 pts' },
]

const POWERUPS = [
  { icon: '⚡', name: 'Doble Golpe',    price: '$590', desc: 'Duplica todos tus puntos en un partido' },
  { icon: '🍀', name: 'Cábala',          price: '$390', desc: 'Cambia tu pronóstico hasta 10 min antes' },
  { icon: '🤖', name: 'Comodín IA',      price: '$290', desc: 'La IA elige el marcador por ti' },
  { icon: '🔄', name: 'Anti-Favorito',  price: '$490', desc: 'Puntos x1.5 si apuestas contra el favorito y aciertas' },
  { icon: '😈', name: 'Mufa Ajeno',      price: '$190', desc: '+2 puntos si el líder falla su pronóstico' },
]

function useCountdown(target: string | undefined) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!target) return
    function tick() {
      const diff = new Date(target!).getTime() - Date.now()
      if (diff <= 0) { setLabel('🔒 Pronósticos cerrados'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(`⏰ Cierra en: ${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  return label
}

export default function GrupoInfoPage() {
  const supabase = createClient()
  const params   = useParams()
  const router   = useRouter()
  const groupId  = params.id as string

  const [group,   setGroup]   = useState<Group | null>(null)
  const [userId,  setUserId]  = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const countdown = useCountdown(group?.predictions_close_at)

  useEffect(() => { init() }, [groupId])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    setUserId(user.id)

    const { data } = await supabase
      .from('groups').select('*').eq('id', groupId).single()
    if (!data) { router.replace('/'); return }
    setGroup(data as Group)
    setLoading(false)
  }

  const color = group ? `#${group.primary_color}` : '#00A86B'
  const split = group?.prize_split ?? { first: 60, second: 30, third: 10 }
  const entryFee = group?.entry_fee_clp ?? 0

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl font-black" style={{ color }}>Cargando...</div>
      </main>
    )
  }
  if (!group) return null

  return (
    <main className="min-h-screen bg-black text-white pb-16">

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-black border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(`/grupos/${groupId}`)}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← Volver
          </button>
          {userId === group.owner_id && (
            <button
              onClick={() => router.push(`/grupos/${groupId}/admin`)}
              className="text-xs px-3 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 transition"
            >
              ✏️ Editar info
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-8">

        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color }}>Info del grupo</div>
          <h1 className="text-3xl font-black">{group.name}</h1>
        </div>

        {/* COUNTDOWN */}
        {group.predictions_close_at && (
          <div
            className="px-4 py-3 rounded-2xl border text-sm font-bold text-center"
            style={{ borderColor: `${color}44`, backgroundColor: `${color}11`, color }}
          >
            {countdown}
          </div>
        )}

        {/* CIERRE DE PRONÓSTICOS */}
        {group.predictions_close_at && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-black mb-3">📅 Cierre de pronósticos</h2>
            <p className="text-sm text-white">
              {format(new Date(group.predictions_close_at), "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Después de esta fecha no se podrán modificar pronósticos.
            </p>
          </section>
        )}

        {/* INSCRIPCIÓN */}
        {entryFee > 0 && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-black mb-3">💰 Inscripción</h2>
            <div className="text-3xl font-black" style={{ color }}>
              ${entryFee.toLocaleString('es-CL')}
              <span className="text-base font-normal text-gray-400 ml-1">CLP por persona</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Monto informativo. La plataforma no administra los pagos.
            </p>
          </section>
        )}

        {/* DISTRIBUCIÓN DE PREMIOS */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="font-black mb-4">🏆 Distribución de premios</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              ['🥇', '1er lugar', split.first],
              ['🥈', '2do lugar', split.second],
              ['🥉', '3er lugar', split.third],
            ] as const).map(([emoji, lbl, pct]) => (
              <div
                key={lbl}
                className="flex flex-col items-center gap-1 py-4 rounded-xl border border-white/10 bg-black"
              >
                <span className="text-2xl">{emoji}</span>
                <span
                  className="text-2xl font-black"
                  style={{ color }}
                >
                  {pct}%
                </span>
                <span className="text-xs text-gray-500">{lbl}</span>
              </div>
            ))}
          </div>
          {entryFee > 0 && group.max_members && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              Pozo estimado (completo): ${(entryFee * group.max_members).toLocaleString('es-CL')} CLP
            </p>
          )}
        </section>

        {/* REGLAMENTO */}
        {group.rules && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-black mb-3">📋 Reglamento</h2>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {group.rules}
            </p>
          </section>
        )}

        {/* SISTEMA DE PUNTOS */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="font-black mb-4">⭐ Sistema de puntos</h2>
          <div className="flex flex-col gap-2">
            {POINT_RULES.map(r => (
              <div key={r.label} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 flex-shrink-0 text-center">{r.icon}</span>
                  <span className="text-sm text-gray-300">{r.label}</span>
                </div>
                <span className="font-black text-sm flex-shrink-0" style={{ color }}>{r.pts}</span>
              </div>
            ))}
          </div>
        </section>

        {/* POWER-UPS */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="font-black mb-4">⚡ Power-ups disponibles</h2>
          <div className="flex flex-col gap-3">
            {POWERUPS.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{p.price}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push(`/grupos/${groupId}/powerups`)}
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-black transition"
            style={{ backgroundColor: color }}
          >
            Ver tienda de power-ups →
          </button>
        </section>

      </div>
    </main>
  )
}
