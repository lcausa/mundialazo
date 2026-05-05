'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TIPOS = [
  { value: 'friends', label: '👫 Amigos', desc: 'El grupo de siempre' },
  { value: 'office', label: '💼 Oficina', desc: 'Compañeros de trabajo' },
  { value: 'family', label: '👨‍👩‍👧‍👦 Familia', desc: 'Los de la casa' },
  { value: 'community', label: '🌎 Comunidad', desc: 'Grupo abierto grande' },
  { value: 'enterprise', label: '🏢 Empresa', desc: 'Corporativo con branding' },
]

const COLORES = [
  '#00A86B', '#3B82F6', '#EF4444', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Math.random().toString(36).slice(2, 6)
}

export default function NuevoGrupoPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tipo, setTipo] = useState('friends')
  const [color, setColor] = useState('#00A86B')
  const [maxMembers, setMaxMembers] = useState(20)
  const [prize, setPrize] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function createGroup() {
    if (!name.trim()) {
      setError('El nombre del grupo es obligatorio')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const slug = slugify(name)

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        slug,
        description: description.trim(),
        owner_id: user.id,
        type: tipo,
        primary_color: color.replace('#', ''),
        max_members: maxMembers,
        prize_description: prize.trim(),
        is_premium: false,
        is_public: tipo === 'community',
      })
      .select()
      .single()

    if (groupError || !group) {
      setError('Error al crear el grupo. Intenta de nuevo.')
      console.error('[nuevo grupo] groupError:', groupError)
      setLoading(false)
      return
    }

    console.log('[nuevo grupo] Grupo creado:', group.id)

    // Agregar al creador como miembro admin
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      })
      .select()
      .single()

    if (memberError) {
      setError('Grupo creado, pero hubo un error al agregarte. Recarga e intenta de nuevo.')
      console.error('[nuevo grupo] memberError:', memberError)
      setLoading(false)
      return
    }

    console.log('[nuevo grupo] Miembro insertado:', memberData)

    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-lg mx-auto">

        {/* HEADER */}
        <div className="mb-10">
          <div
            className="text-2xl font-black tracking-wider mb-1 cursor-pointer"
            style={{ color }}
            onClick={() => router.push('/')}
          >
            MUNDIALAZO
          </div>
          <h1 className="text-3xl font-black">Crear mi polla</h1>
          <p className="text-gray-400 text-sm mt-1">
            Lista en 60 segundos. Invita por WhatsApp.
          </p>
        </div>

        <div className="flex flex-col gap-8">

          {/* NOMBRE */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Nombre del grupo *
            </label>
            <input
              type="text"
              placeholder="Ej: Polla Oficina TI, Los del Asado..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B] transition"
            />
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Descripción <span className="text-gray-600 normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: La polla de los del 4to piso"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B] transition"
            />
          </div>

          {/* TIPO */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
              Tipo de grupo
            </label>
            <div className="grid grid-cols-1 gap-2">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                    tipo === t.value
                      ? 'border-[#00A86B] bg-[#00A86B]/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <span className="text-xl">{t.label.split(' ')[0]}</span>
                  <div>
                    <div className="font-bold text-sm">
                      {t.label.split(' ').slice(1).join(' ')}
                    </div>
                    <div className="text-xs text-gray-500">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* COLOR */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
              Color del grupo
            </label>
            <div className="flex gap-3">
              {COLORES.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-lg border-2 transition ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* MAX MIEMBROS */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Máximo de participantes: <span className="text-white">{maxMembers}</span>
            </label>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={maxMembers}
              onChange={e => setMaxMembers(Number(e.target.value))}
              className="w-full accent-[#00A86B]"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>5</span>
              <span>200</span>
            </div>
          </div>

          {/* PREMIO */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Premio o apuesta <span className="text-gray-600 normal-case font-normal">(informativo)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: El que pierde paga el asado"
              value={prize}
              onChange={e => setPrize(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B] transition"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {/* BOTÓN */}
          <button
            onClick={createGroup}
            disabled={loading || !name.trim()}
            className="w-full py-4 text-lg font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: color,
              color: '#000'
            }}
          >
            {loading ? 'Creando...' : 'Crear mi polla →'}
          </button>

          <p className="text-xs text-gray-600 text-center">
            Gratis hasta 20 participantes. Después podrás invitar por WhatsApp.
          </p>

        </div>
      </div>
    </main>
  )
}