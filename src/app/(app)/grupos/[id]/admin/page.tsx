'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import type { Group, GroupMember, Match } from '@/types'

const COLOR_CATALOG = [
  { hex: '00A86B', label: 'Verde'    },
  { hex: '3B82F6', label: 'Azul'     },
  { hex: 'EF4444', label: 'Rojo'     },
  { hex: 'F59E0B', label: 'Amarillo' },
  { hex: '8B5CF6', label: 'Violeta'  },
  { hex: 'EC4899', label: 'Rosa'     },
  { hex: 'F97316', label: 'Naranja'  },
  { hex: 'FFFFFF', label: 'Blanco'   },
]

type MatchDraft = {
  home_score: string
  away_score: string
  had_red_card: boolean
  had_var: boolean
  saving: boolean
  saved: boolean
}

export default function AdminPage() {
  const supabase = createClient()
  const params   = useParams()
  const router   = useRouter()
  const groupId  = params.id as string

  const [group,     setGroup]     = useState<Group | null>(null)
  const [members,   setMembers]   = useState<GroupMember[]>([])
  const [matches,   setMatches]   = useState<Match[]>([])
  const [loading,   setLoading]   = useState(true)
  const [forbidden, setForbidden] = useState(false)

  // Section 1 – edit group
  const [formName,    setFormName]    = useState('')
  const [formDesc,    setFormDesc]    = useState('')
  const [formPrize,   setFormPrize]   = useState('')
  const [formColor,   setFormColor]   = useState('')
  const [savingGroup, setSavingGroup] = useState(false)
  const [groupSaved,  setGroupSaved]  = useState(false)

  // Section 2 – match results
  const [drafts, setDrafts] = useState<Record<string, MatchDraft>>({})

  // Section 3 – members
  const [memberOp, setMemberOp] = useState<Record<string, boolean>>({})

  useEffect(() => { init() }, [groupId])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (!groupData) { router.push('/'); return }

    if (groupData.owner_id !== user.id) {
      setForbidden(true)
      setLoading(false)
      return
    }

    setGroup(groupData)
    setFormName(groupData.name)
    setFormDesc(groupData.description ?? '')
    setFormPrize(groupData.prize_description ?? '')
    setFormColor(groupData.primary_color)

    const [{ data: membersData }, { data: matchData }] = await Promise.all([
      supabase
        .from('group_members')
        .select('*, user:users(*)')
        .eq('group_id', groupId)
        .order('points', { ascending: false }),
      supabase
        .from('matches')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('starts_at', { ascending: true }),
    ])

    setMembers((membersData as GroupMember[]) || [])

    const matchList = (matchData as Match[]) || []
    setMatches(matchList)

    const d: Record<string, MatchDraft> = {}
    for (const m of matchList) {
      d[m.id] = {
        home_score:   String(m.home_score ?? ''),
        away_score:   String(m.away_score ?? ''),
        had_red_card: m.had_red_card ?? false,
        had_var:      m.had_var ?? false,
        saving: false,
        saved:  false,
      }
    }
    setDrafts(d)
    setLoading(false)
  }

  // ── Section 1 ──────────────────────────────────────────────────────────────
  async function saveGroup() {
    if (!group || !formName.trim()) return
    setSavingGroup(true)
    const { error } = await supabase
      .from('groups')
      .update({
        name:              formName.trim(),
        description:       formDesc.trim() || null,
        prize_description: formPrize.trim() || null,
        primary_color:     formColor,
      })
      .eq('id', group.id)

    setSavingGroup(false)
    if (!error) {
      setGroup(prev => prev
        ? { ...prev, name: formName.trim(), description: formDesc.trim() || undefined, prize_description: formPrize.trim() || undefined, primary_color: formColor }
        : prev
      )
      setGroupSaved(true)
      setTimeout(() => setGroupSaved(false), 2500)
    }
  }

  // ── Section 2 ──────────────────────────────────────────────────────────────
  function updateDraft(matchId: string, patch: Partial<MatchDraft>) {
    setDrafts(prev => ({ ...prev, [matchId]: { ...prev[matchId], ...patch, saved: false } }))
  }

  async function finishMatch(matchId: string) {
    const d = drafts[matchId]
    const home = parseInt(d.home_score, 10)
    const away = parseInt(d.away_score, 10)
    if (isNaN(home) || isNaN(away)) return

    setDrafts(prev => ({ ...prev, [matchId]: { ...prev[matchId], saving: true } }))
    const { error } = await supabase
      .from('matches')
      .update({
        home_score:   home,
        away_score:   away,
        had_red_card: d.had_red_card,
        had_var:      d.had_var,
        status:       'finished',
      })
      .eq('id', matchId)

    if (!error) {
      setMatches(prev => prev.filter(m => m.id !== matchId))
      setDrafts(prev => {
        const next = { ...prev }
        delete next[matchId]
        return next
      })
    } else {
      setDrafts(prev => ({ ...prev, [matchId]: { ...prev[matchId], saving: false } }))
    }
  }

  // ── Section 3 ──────────────────────────────────────────────────────────────
  async function toggleRole(member: GroupMember) {
    if (!group || member.user_id === group.owner_id) return
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    setMemberOp(prev => ({ ...prev, [member.user_id]: true }))
    await supabase
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)
    setMembers(prev => prev.map(m =>
      m.user_id === member.user_id ? { ...m, role: newRole } : m
    ))
    setMemberOp(prev => ({ ...prev, [member.user_id]: false }))
  }

  async function kickMember(member: GroupMember) {
    if (!group || member.user_id === group.owner_id) return
    if (!confirm(`¿Expulsar a ${member.user?.alias || member.user?.name || 'este usuario'}?`)) return
    setMemberOp(prev => ({ ...prev, [member.user_id]: true }))
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)
    setMembers(prev => prev.filter(m => m.user_id !== member.user_id))
    setMemberOp(prev => ({ ...prev, [member.user_id]: false }))
  }

  const color = group ? `#${group.primary_color}` : '#00A86B'

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl font-black" style={{ color }}>Cargando...</div>
      </main>
    )
  }

  // ── FORBIDDEN ───────────────────────────────────────────────────────────────
  if (forbidden) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-2xl font-black">No tienes permisos</h1>
        <p className="text-gray-500 text-sm">Solo el creador del grupo puede acceder a esta sección.</p>
        <button
          onClick={() => router.push(`/grupos/${groupId}`)}
          className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-bold hover:bg-white/20 transition"
        >
          ← Volver al grupo
        </button>
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
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
            Admin
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-8">

        <div>
          <h1 className="text-3xl font-black">{group.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Panel de administración</p>
        </div>

        {/* ── SECCIÓN 1: EDITAR GRUPO ─────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
          <h2 className="font-black text-lg">Editar grupo</h2>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Nombre</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="px-4 py-3 bg-black border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/50 transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Descripción</label>
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              rows={2}
              className="px-4 py-3 bg-black border border-white/20 rounded-xl text-white resize-none focus:outline-none focus:border-white/50 transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Premio</label>
            <input
              value={formPrize}
              onChange={e => setFormPrize(e.target.value)}
              placeholder="Ej: Cena para 4 personas"
              className="px-4 py-3 bg-black border border-white/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-white/50 transition"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Color del grupo</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_CATALOG.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setFormColor(c.hex)}
                  title={c.label}
                  className="w-9 h-9 rounded-xl border-2 transition"
                  style={{
                    backgroundColor: `#${c.hex}`,
                    borderColor: formColor === c.hex ? 'white' : 'transparent',
                    boxShadow: formColor === c.hex ? `0 0 0 2px #${c.hex}44` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={saveGroup}
            disabled={savingGroup || !formName.trim()}
            className="py-3 rounded-xl font-bold text-black transition disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {savingGroup ? 'Guardando...' : groupSaved ? '✓ Cambios guardados' : 'Guardar cambios'}
          </button>
        </section>

        {/* ── SECCIÓN 2: RESULTADOS ───────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-black text-lg">Cargar resultados</h2>

          {matches.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-8 text-center text-gray-500 text-sm">
              No hay partidos pendientes de resultado.
            </div>
          )}

          {matches.map(match => {
            const d = drafts[match.id]
            if (!d) return null
            const canSave = d.home_score !== '' && d.away_score !== '' &&
              !isNaN(parseInt(d.home_score, 10)) && !isNaN(parseInt(d.away_score, 10))

            return (
              <div
                key={match.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3"
              >
                {/* Equipos */}
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>{match.home_flag ?? ''} {match.home_team}</span>
                  <span className="text-gray-600 font-black">VS</span>
                  <span>{match.away_team} {match.away_flag ?? ''}</span>
                </div>

                {/* Scores */}
                <div className="flex items-center gap-3 justify-center">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    inputMode="numeric"
                    value={d.home_score}
                    onChange={e => updateDraft(match.id, { home_score: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    placeholder="0"
                    className="w-16 h-14 text-center text-2xl font-black bg-black border border-white/20 rounded-xl focus:outline-none focus:border-white/50 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-gray-600 font-black text-xl">:</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    inputMode="numeric"
                    value={d.away_score}
                    onChange={e => updateDraft(match.id, { away_score: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    placeholder="0"
                    className="w-16 h-14 text-center text-2xl font-black bg-black border border-white/20 rounded-xl focus:outline-none focus:border-white/50 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex gap-4 justify-center text-sm">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={d.had_red_card}
                      onChange={e => updateDraft(match.id, { had_red_card: e.target.checked })}
                      className="w-4 h-4 accent-red-500"
                    />
                    <span>🟥 Hubo expulsión</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={d.had_var}
                      onChange={e => updateDraft(match.id, { had_var: e.target.checked })}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span>📺 VAR</span>
                  </label>
                </div>

                <button
                  onClick={() => finishMatch(match.id)}
                  disabled={!canSave || d.saving}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-black transition disabled:opacity-40"
                  style={{ backgroundColor: canSave ? color : '#ffffff22' }}
                >
                  {d.saving ? 'Guardando...' : 'Marcar como finalizado ✓'}
                </button>
              </div>
            )
          })}
        </section>

        {/* ── SECCIÓN 3: MIEMBROS ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-black text-lg">Miembros ({members.length})</h2>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {members.map((member, i) => {
              const isOwner = member.user_id === group.owner_id
              const busy    = memberOp[member.user_id] ?? false

              return (
                <div
                  key={member.user_id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < members.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <div className="text-xl">{member.user?.avatar_url || '⚽'}</div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">
                      {member.user?.alias || member.user?.name || 'Jugador'}
                      {isOwner && (
                        <span className="ml-2 text-xs text-gray-500 font-normal">owner</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.role === 'admin' ? 'Admin' : 'Miembro'} · {member.points} pts
                    </div>
                  </div>

                  {!isOwner && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleRole(member)}
                        disabled={busy}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition disabled:opacity-40"
                      >
                        {member.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button
                        onClick={() => kickMember(member)}
                        disabled={busy}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
                      >
                        Expulsar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

      </div>
    </main>
  )
}
