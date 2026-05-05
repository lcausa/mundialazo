'use client'

import { useEffect, useRef, useState } from 'react'

interface AICommentaryCardProps {
  comentario:  string
  loading?:    boolean
  onShare?:    () => void
  color?:      string
}

export default function AICommentaryCard({
  comentario,
  loading = false,
  onShare,
  color = '#00A86B',
}: AICommentaryCardProps) {
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping]       = useState(false)
  const rafRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Typing effect when comentario changes
  useEffect(() => {
    if (loading || !comentario) {
      setDisplayed('')
      return
    }

    setTyping(true)
    setDisplayed('')
    let i = 0

    function tick() {
      i++
      setDisplayed(comentario.slice(0, i))
      if (i < comentario.length) {
        rafRef.current = setTimeout(tick, 18)
      } else {
        setTyping(false)
      }
    }

    rafRef.current = setTimeout(tick, 18)
    return () => { if (rafRef.current) clearTimeout(rafRef.current) }
  }, [comentario, loading])

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10"
      style={{
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
      }}
    >
      {/* Glow accent */}
      <div
        className="absolute top-0 left-0 w-full h-0.5"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />

      <div className="flex items-start gap-3 px-4 py-4">
        {/* Bot avatar */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44` }}
        >
          {loading ? (
            <span className="animate-spin text-base">⚙️</span>
          ) : (
            <span>🤖</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color }}>
            IA Narrador
          </div>

          {loading ? (
            <div className="flex gap-1 items-center h-5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <p className="text-sm text-white/90 leading-relaxed">
              {displayed}
              {typing && (
                <span className="inline-block w-0.5 h-4 bg-white/70 ml-0.5 align-middle animate-pulse" />
              )}
            </p>
          )}
        </div>
      </div>

      {/* Share button */}
      {!loading && comentario && onShare && (
        <div className="px-4 pb-3 flex justify-end">
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-black text-xs font-bold rounded-xl hover:bg-[#20B558] transition"
          >
            <span>📲</span> Compartir
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Hook helper ─────────────────────────────────────────────────────────────

export function useAIComentario() {
  const [comentario, setComentario] = useState('')
  const [loading,    setLoading]    = useState(false)

  async function fetchComentario(params: {
    type:     string
    groupId:  string
    matchId?: string
    meta?:    Record<string, string>
  }) {
    setLoading(true)
    setComentario('')
    try {
      const res = await fetch('/api/ai/comentario', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(params),
      })
      const data = await res.json()
      if (data.comentario) setComentario(data.comentario)
    } finally {
      setLoading(false)
    }
  }

  function shareOnWhatsApp(groupName: string) {
    if (!comentario) return
    const text = encodeURIComponent(`${comentario}\n\n¡Jugá en Mundialazo: ${groupName}! ⚽`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return { comentario, loading, fetchComentario, shareOnWhatsApp }
}
