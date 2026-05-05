import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateComentario, type ComentarioType } from '@/lib/ai/comentario'
import {
  roastUltimoLugar,
  felicitarLider,
  resumenFecha,
  tipPrePartido,
} from '@/lib/ai/prompts'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, groupId, matchId, meta } = body as {
      type:     ComentarioType
      groupId:  string
      matchId?: string
      meta?:    Record<string, string>
    }

    if (!type || !groupId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Build the prompt according to type
    let prompt: string
    switch (type) {
      case 'roast':
        prompt = roastUltimoLugar(meta?.grupo ?? 'tu grupo', meta?.usuario ?? 'alguien')
        break
      case 'lider':
        prompt = felicitarLider(meta?.grupo ?? 'tu grupo', meta?.usuario ?? 'alguien')
        break
      case 'resumen':
        prompt = resumenFecha(
          meta?.grupo ?? 'tu grupo',
          JSON.parse(meta?.partidos ?? '[]'),
          JSON.parse(meta?.top3 ?? '[]')
        )
        break
      case 'tip':
        prompt = tipPrePartido(
          meta?.home ?? 'Local',
          meta?.away ?? 'Visitante',
          meta?.datos ?? ''
        )
        break
      default:
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    const comentario = await generateComentario({ type, prompt })

    // Save to ai_messages table
    await supabase.from('ai_messages').insert({
      group_id:   groupId,
      match_id:   matchId ?? null,
      user_id:    user.id,
      type,
      content:    comentario,
    })

    return NextResponse.json({ comentario })
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
