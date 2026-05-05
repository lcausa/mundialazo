'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PowerUp, PowerUpEffect } from '@/types'

const EFFECT_COLOR: Record<PowerUpEffect, string> = {
  double_points: '#D4A017',
  change_pick:   '#8B5CF6',
  ai_pick:       '#06B6D4',
  anti_favorite: '#F97316',
  rival_mufa:    '#EF4444',
}

type Step = 'select' | 'processing' | 'success' | 'error'

const PAYMENT_METHODS = [
  { id: 'khipu',  label: 'Khipu',  icon: '🏦', description: 'Transferencia bancaria' },
  { id: 'flow',   label: 'Flow',   icon: '💳', description: 'Tarjeta / débito / crédito' },
]

interface PaymentMockModalProps {
  powerup:  PowerUp
  groupId:  string
  userId:   string
  onClose:  () => void
  onSuccess: () => void
}

export default function PaymentMockModal({
  powerup,
  groupId,
  userId,
  onClose,
  onSuccess,
}: PaymentMockModalProps) {
  const supabase        = createClient()
  const [step, setStep] = useState<Step>('select')
  const color           = EFFECT_COLOR[powerup.effect]

  async function handlePayment(methodId: string) {
    void methodId  // method recorded; would be sent to payment API in production
    setStep('processing')

    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 1500))

    const { error } = await supabase.from('user_powerups').insert({
      user_id:    userId,
      group_id:   groupId,
      powerup_id: powerup.id,
      status:     'available',
    })

    if (error) {
      setStep('error')
    } else {
      setStep('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1800)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 flex flex-col gap-5">

        {/* Power-up info */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
          >
            {powerup.icon}
          </div>
          <div>
            <div className="font-black text-base">{powerup.name}</div>
            <div className="text-xs text-gray-400">{powerup.description}</div>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 border-b border-white/10 pb-4">
          <span className="text-3xl font-black">
            ${powerup.price_clp.toLocaleString('es-CL')}
          </span>
          <span className="text-sm text-gray-500">CLP</span>
        </div>

        {/* Content by step */}
        {step === 'select' && (
          <>
            <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
              Elige método de pago
            </div>
            <div className="flex flex-col gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => handlePayment(m.id)}
                  className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/25 transition text-left"
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <div className="font-bold text-sm">{m.label}</div>
                    <div className="text-xs text-gray-500">{m.description}</div>
                  </div>
                  <span className="ml-auto text-gray-600 text-sm">→</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 text-center">
              🔒 Pago seguro · Ambiente de demostración
            </p>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div
              className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${color}44`, borderTopColor: color }}
            />
            <div className="font-bold text-sm">Procesando pago...</div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
              style={{ backgroundColor: `${color}22` }}
            >
              ✅
            </div>
            <div className="font-black text-lg">¡Power-up adquirido!</div>
            <div className="text-sm text-gray-400">
              {powerup.name} está listo en tus power-ups disponibles.
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="text-4xl">❌</div>
            <div className="font-bold text-sm">Error al procesar</div>
            <button
              onClick={() => setStep('select')}
              className="text-xs underline text-gray-400"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Close */}
        {step === 'select' && (
          <button
            onClick={onClose}
            className="text-xs text-gray-600 text-center hover:text-gray-400 transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
