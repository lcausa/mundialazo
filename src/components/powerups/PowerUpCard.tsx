'use client'

import type { PowerUp, PowerUpEffect } from '@/types'

const EFFECT_CONFIG: Record<PowerUpEffect, { color: string; bg: string; label: string }> = {
  double_points:  { color: '#D4A017', bg: '#D4A01718', label: 'Puntos x2'    },
  change_pick:    { color: '#8B5CF6', bg: '#8B5CF618', label: 'Cambio'       },
  ai_pick:        { color: '#06B6D4', bg: '#06B6D418', label: 'IA'           },
  anti_favorite:  { color: '#F97316', bg: '#F9731618', label: 'Anti-favorito'},
  rival_mufa:     { color: '#EF4444', bg: '#EF444418', label: 'Mufa'         },
}

interface PowerUpCardProps {
  powerup:     PowerUp
  onBuy:       (powerup: PowerUp) => void
  ownedCount?: number
}

export default function PowerUpCard({ powerup, onBuy, ownedCount = 0 }: PowerUpCardProps) {
  const cfg = EFFECT_CONFIG[powerup.effect]

  return (
    <div
      className="relative rounded-2xl border border-white/10 p-4 flex flex-col gap-3 transition-all duration-200 hover:border-white/25 hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: cfg.bg }}
    >
      {/* Owned badge */}
      {ownedCount > 0 && (
        <span
          className="absolute top-3 right-3 text-xs font-black px-2 py-0.5 rounded-full text-black"
          style={{ backgroundColor: cfg.color }}
        >
          x{ownedCount}
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${cfg.color}22`, border: `1px solid ${cfg.color}55` }}
        >
          {powerup.icon}
        </div>
        <div>
          <div className="font-black text-sm leading-tight">{powerup.name}</div>
          <div
            className="text-xs font-bold mt-0.5"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-relaxed flex-1">
        {powerup.description}
      </p>

      {/* Price + Buy */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <span className="font-black text-lg text-white">
            ${powerup.price_clp.toLocaleString('es-CL')}
          </span>
          <span className="text-xs text-gray-500 ml-1">CLP</span>
        </div>
        <button
          onClick={() => onBuy(powerup)}
          className="px-4 py-2 rounded-xl text-sm font-bold text-black transition-all hover:brightness-110 active:scale-95"
          style={{ backgroundColor: cfg.color }}
        >
          Comprar
        </button>
      </div>
    </div>
  )
}
