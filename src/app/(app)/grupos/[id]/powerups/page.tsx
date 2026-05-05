'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import type { Group, PowerUp, UserPowerUp, PowerUpEffect } from '@/types'
import PowerUpCard from '@/components/powerups/PowerUpCard'
import PaymentMockModal from '@/components/powerups/PaymentMockModal'

const EFFECT_COLOR: Record<PowerUpEffect, string> = {
  double_points: '#D4A017',
  change_pick:   '#8B5CF6',
  ai_pick:       '#06B6D4',
  anti_favorite: '#F97316',
  rival_mufa:    '#EF4444',
}

export default function PowerUpsPage() {
  const supabase = createClient()
  const params   = useParams()
  const router   = useRouter()
  const groupId  = params.id as string

  const [group,       setGroup]       = useState<Group | null>(null)
  const [powerups,    setPowerups]    = useState<PowerUp[]>([])
  const [myPowerups,  setMyPowerups]  = useState<UserPowerUp[]>([])
  const [userId,      setUserId]      = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [buying,      setBuying]      = useState<PowerUp | null>(null)

  useEffect(() => { init() }, [groupId])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const [{ data: groupData }, { data: puData }, { data: myPuData }] =
      await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId).single(),
        supabase.from('powerups').select('*').eq('is_active', true).order('price_clp'),
        supabase
          .from('user_powerups')
          .select('*, powerup:powerups(*)')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .eq('status', 'available'),
      ])

    if (!groupData) { router.push('/'); return }

    setGroup(groupData)
    setPowerups((puData as PowerUp[]) || [])
    setMyPowerups((myPuData as UserPowerUp[]) || [])
    setLoading(false)
  }

  async function reloadMyPowerups() {
    if (!userId) return
    const { data } = await supabase
      .from('user_powerups')
      .select('*, powerup:powerups(*)')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'available')
    setMyPowerups((data as UserPowerUp[]) || [])
  }

  // Count how many of each powerup the user owns
  const ownedCount: Record<string, number> = {}
  for (const up of myPowerups) {
    ownedCount[up.powerup_id] = (ownedCount[up.powerup_id] ?? 0) + 1
  }

  const color = group ? `#${group.primary_color}` : '#00A86B'

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl font-black" style={{ color }}>Cargando...</div>
      </main>
    )
  }

  if (!group || !userId) return null

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
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
            Power-ups
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-8">

        <div>
          <h1 className="text-3xl font-black">Power-ups</h1>
          <p className="text-sm text-gray-500 mt-1">{group.name}</p>
        </div>

        {/* ── MIS POWER-UPS ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-lg">Mis power-ups</h2>
            <span className="text-xs text-gray-500">
              {myPowerups.length} disponible{myPowerups.length !== 1 ? 's' : ''}
            </span>
          </div>

          {myPowerups.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-8 text-center text-gray-500 text-sm">
              Aún no tienes power-ups. ¡Consigue uno abajo! ⚡
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {myPowerups.map(up => {
                const pu = up.powerup
                if (!pu) return null
                const c = EFFECT_COLOR[pu.effect]
                return (
                  <div
                    key={up.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-sm font-bold"
                    style={{ backgroundColor: `${c}18`, borderColor: `${c}44` }}
                  >
                    <span>{pu.icon}</span>
                    <span style={{ color: c }}>{pu.name}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── TIENDA ────────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-black text-lg mb-4">Tienda</h2>

          {powerups.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-8 text-center text-gray-500 text-sm">
              No hay power-ups disponibles por ahora.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {powerups.map(pu => (
                <PowerUpCard
                  key={pu.id}
                  powerup={pu}
                  ownedCount={ownedCount[pu.id] ?? 0}
                  onBuy={setBuying}
                />
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600 text-center mt-6">
            Los power-ups son por grupo y se usan al pronosticar partidos.
          </p>
        </section>

      </div>

      {/* MODAL DE PAGO */}
      {buying && (
        <PaymentMockModal
          powerup={buying}
          groupId={groupId}
          userId={userId}
          onClose={() => setBuying(null)}
          onSuccess={reloadMyPowerups}
        />
      )}
    </main>
  )
}
