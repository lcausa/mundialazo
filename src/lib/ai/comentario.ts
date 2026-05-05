import Anthropic from '@anthropic-ai/sdk'
import anthropic from './claude'
import { SYSTEM_PROMPT } from './prompts'

const FALLBACKS: Record<string, string> = {
  roast:    '¡Ánimo! El campeón siempre viene de atrás 💪⚽',
  lider:    '¡Vas primero! Pero el fútbol es sabio y todo puede cambiar 🏆',
  resumen:  'Una fecha llena de emociones. ¡Así es el fútbol! ⚽🔥',
  tip:      'Confía en tu instinto mundialero. ¡Tú sabes más de lo que crees! 🎯',
  default:  '¡El fútbol nunca deja de sorprender! ⚽',
}

export type ComentarioType = 'roast' | 'lider' | 'resumen' | 'tip'

interface GenerateComentarioParams {
  type:    ComentarioType
  prompt:  string
}

export async function generateComentario({
  type,
  prompt,
}: GenerateComentarioParams): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 0.85,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // Cache the stable system prompt across all commentary requests
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.TextBlockParam[],
      messages: [
        { role: 'user', content: prompt },
      ],
    })

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )
    const text = textBlock?.text?.trim() ?? ''

    // Truncate to 240 chars if model exceeded the limit
    return text.length > 240 ? text.slice(0, 237) + '...' : text
  } catch {
    return FALLBACKS[type] ?? FALLBACKS.default
  }
}
