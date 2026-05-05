'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Group, Match, MatchStage, Prediction } from '@/types'

const STAGE_LABELS: Record<MatchStage, string> = {
  group:  'Fase de grupos',
  r32:    'Treintaidosavos',
  r16:    'Octavos',
  qf:     'Cuartos',
  sf:     'Semifinal',
  third:  'Tercer puesto',
  final:  'Final',
}

const STAGE_ORDER: MatchStage[] = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final']

type PredMap = Record<string, { home: string; away: string; saved: boolean; locked: boolean }>

function useCountdown(target: string | undefined) {
  const [label, setLabel] = useState<{ text: string; closed: boolean }>({ text: '', closed: false })

  useEffect(() => {
    if (!target) return
    function tick() {
      const diff = new Date(target!).getTime() - Date.now()
      if (diff <= 0) {
        setLabel({ text: '🔒 Pronósticos cerrados', closed: true })
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setLabel({
        text: `⏰ Cierre en: ${d > 0 ? `${d}d ` : ''}${h}h ${m}m`,
        closed: false,
      })
    }
    tick()
    const id = setInterval(tick, 30000) // update every 30s
    return () => clearInterval(id)
  }, [target])

  return label
}

export default function PronosticosPage() {
  const supabase  = createClient()
  const params    = useParams()
  const router    = useRouter()
  const groupId   = params.id as string

  const [group,      setGroup]      = useState<Group | null>(null)
  const [matches,    setMatches]    = useState<Match[]>([])
  const [predMap,    setPredMap]    = useState<PredMap>({})
  const [activeTab,  setActiveTab]  = useState<MatchStage>('group')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState<string | null>(null)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const countdown = useCountdown(group?.predictions_close_at)

  useEffect(() => { init() }, [groupId])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: membership } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) { router.push('/'); return }

    const [{ data: groupData }, { data: matchData }, { data: predData }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase.from('matches').select('*').order('starts_at', { ascending: true }),
      supabase.from('predictions').select('*').eq('group_id', groupId).eq('user_id', user.id),
    ])

    if (!groupData) { router.push('/'); return }

    setGroup(groupData)
    setMatches(matchData || [])

    const map: PredMap = {}
    for (const p of (predData || []) as Prediction[]) {
      map[p.match_id] = {
        home:   String(p.pred_home),
        away:   String(p.pred_away),
        saved:  true,
        locked: p.is_locked,
      }
    }
    setPredMap(map)
    setLoading(false)
  }

  function showToast(msg: string, ok: boolean) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  async function savePrediction(matchId: string) {
    const entry = predMap[matchId]
    const home  = parseInt(entry?.home ?? '', 10)
    const away  = parseInt(entry?.away ?? '', 10)
    if (isNaN(home) || isNaN(away)) {
      showToast('Ingresa ambos marcadores', false)
      return
    }

    setSaving(matchId)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('predictions').upsert(
      {
        match_id:  matchId,
        group_id:  groupId,
        user_id:   user!.id,
        pred_home: home,
        pred_away: away,
      },
      { onConflict: 'match_id,group_id,user_id' }
    )
    setSaving(null)

    if (error) {
      showToast('Error al guardar', false)
    } else {
      setPredMap(prev => ({ ...prev, [matchId]: { ...prev[matchId], saved: true, locked: false } }))
      showToast('¡Guardado!', true)
    }
  }

  function updateScore(matchId: string, side: 'home' | 'away', val: string) {
    const num = val.replace(/\D/g, '').slice(0, 2)
    setPredMap(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: '', away: '', saved: false, locked: false }), [side]: num, saved: false },
    }))
  }

  function isLocked(match: Match): boolean {
    const pred      = predMap[match.id]
    const now       = new Date()
    const matchStart = new Date(match.starts_at)

    // Locked if prediction row is locked
    if (pred?.locked) return true
    // Locked if match already started
    if (matchStart <= now) return true
    // Locked if group-wide close date has passed
    if (group?.predictions_close_at && new Date(group.predictions_close_at) <= now) return true

    return false
  }

  const stagesPresent  = STAGE_ORDER.filter(s => matches.some(m => m.stage === s))
  const visibleMatches = matches.filter(m => m.stage === activeTab)
  const totalSaved     = Object.values(predMap).filter(p => p.saved).length
  const color          = group ? `#${group.primary_color}` : '#00A86B'
  const globalClosed   = group?.predictions_close_at
    ? new Date(group.predictions_close_at) <= new Date()
    : false

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
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
          >
            ← Volver
          </button>
          <span className="text-xs text-gray-500">
            <span className="font-bold text-white">{totalSaved}</span> de {matches.length} pronosticados
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="text-3xl font-black mb-1">Pronósticos</h1>
        <p className="text-sm text-gray-400 mb-4">{group.name}</p>

        {/* COUNTDOWN BANNER */}
        {group.predictions_close_at && (
          <div
            className="mb-6 px-4 py-2.5 rounded-xl text-sm font-bold text-center"
            style={
              globalClosed
                ? { backgroundColor: '#ffffff10', color: '#9ca3af' }
                : { backgroundColor: `${color}18`, color }
            }
          >
            {countdown.text}
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {stagesPresent.map(stage => (
            <button
              key={stage}
              onClick={() => setActiveTab(stage)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition ${
                activeTab === stage
                  ? 'text-black border-transparent'
                  : 'text-gray-400 border-white/15 hover:border-white/40'
              }`}
              style={activeTab === stage ? { backgroundColor: color, borderColor: color } : {}}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>

        {/* PARTIDOS */}
        <div className="flex flex-col gap-4">
          {visibleMatches.length === 0 && (
            <div className="text-center text-gray-500 py-16">No hay partidos en esta fase</div>
          )}

          {visibleMatches.map(match => {
            const locked   = isLocked(match)
            const finished = match.status === 'finished'
            const pred     = predMap[match.id]

            return (
              <div
                key={match.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                {/* Fecha, hora y estado */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 capitalize">
                    {format(new Date(match.starts_at), "EEEE d MMM · HH:mm", { locale: es })}
                  </span>
                  {finished ? (
                    <span className="text-xs font-bold text-gray-400">Finalizado</span>
                  ) : locked ? (
                    <span className="text-xs text-gray-500 font-bold">🔒 Cerrado</span>
                  ) : pred?.saved ? (
                    <span className="text-xs font-bold" style={{ color }}>
                      Editable hasta cierre
                    </span>
                  ) : null}
                </div>

                {/* Equipos e inputs */}
                <div className="flex items-center gap-3">

                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-2xl">{match.home_flag || '🏳️'}</span>
                    <span className="text-xs font-bold text-center leading-tight">{match.home_team}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {finished ? (
                      <>
                        <div className="w-12 h-12 flex items-center justify-center bg-black border border-white/20 rounded-xl text-2xl font-black">
                          {match.home_score ?? '-'}
                        </div>
                        <span className="text-gray-600 font-black">:</span>
                        <div className="w-12 h-12 flex items-center justify-center bg-black border border-white/20 rounded-xl text-2xl font-black">
                          {match.away_score ?? '-'}
                        </div>
                      </>
                    ) : (
                      <>
                        <input
                          type="number" min={0} max={20} inputMode="numeric"
                          disabled={locked}
                          value={pred?.home ?? ''}
                          onChange={e => updateScore(match.id, 'home', e.target.value)}
                          className="w-12 h-12 text-center text-2xl font-black bg-black border border-white/20 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-white/60 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-gray-600 font-black">:</span>
                        <input
                          type="number" min={0} max={20} inputMode="numeric"
                          disabled={locked}
                          value={pred?.away ?? ''}
                          onChange={e => updateScore(match.id, 'away', e.target.value)}
                          className="w-12 h-12 text-center text-2xl font-black bg-black border border-white/20 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-white/60 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-2xl">{match.away_flag || '🏳️'}</span>
                    <span className="text-xs font-bold text-center leading-tight">{match.away_team}</span>
                  </div>
                </div>

                {/* Pronóstico guardado vs resultado */}
                {finished && pred?.saved && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      Tu pronóstico:{' '}
                      <span className="font-bold text-white">{pred.home} - {pred.away}</span>
                    </span>
                  </div>
                )}

                {/* Botón guardar / actualizar */}
                {!locked && (
                  <button
                    onClick={() => savePrediction(match.id)}
                    disabled={saving === match.id}
                    className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-black transition disabled:opacity-60"
                    style={{ backgroundColor: pred?.saved ? `${color}88` : color }}
                  >
                    {saving === match.id
                      ? 'Guardando...'
                      : pred?.saved
                      ? '✓ Actualizar pronóstico'
                      : 'Guardar pronóstico'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl transition-all ${
            toast.ok ? 'bg-[#00A86B] text-black' : 'bg-red-500 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </main>
  )
}
