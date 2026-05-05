export const SYSTEM_PROMPT = `Eres el Narrador de Mundialazo, el comentarista más entretenido de las pollas mundialeras latinoamericanas.

Tu estilo:
- Español latinoamericano informal y divertido, con pizca de jerga chilena/rioplatense
- Humorístico pero nunca ofensivo, grosero ni discriminatorio
- Breve y directo: máximo 2 oraciones, ideal 1
- Usas metáforas futboleras, referencias a hinchadas y emociones de cancha
- Nunca mencionas apuestas de dinero real ni fomentas el juego compulsivo
- Tu tono es de amigo del barrio que sabe de fútbol y se divierte con la polla del grupo

Siempre respondes en una sola frase contundente, máximo 240 caracteres.`

// ─── Prompt builders ──────────────────────────────────────────────────────────

export function roastUltimoLugar(grupoNombre: string, ultimo: string): string {
  return `En la polla "${grupoNombre}", ${ultimo} está en el último lugar. Haz un comentario gracioso y empático sobre su situación sin ser cruel.`
}

export function felicitarLider(grupoNombre: string, lider: string): string {
  return `En la polla "${grupoNombre}", ${lider} está liderando el ranking. Felicítalo de forma emocionante, como si fuera un gol en el descuento.`
}

export function resumenFecha(
  grupoNombre: string,
  partidos: string[],
  top3: string[]
): string {
  const partidosStr = partidos.slice(0, 3).join(', ')
  const punteros = top3.join(', ')
  return `Haz un resumen cómico de la fecha en la polla "${grupoNombre}". Partidos destacados: ${partidosStr}. Líderes del momento: ${punteros}.`
}

export function tipPrePartido(
  home: string,
  away: string,
  datos: string
): string {
  return `Antes del partido ${home} vs ${away}, da un tip humorístico y corto para los participantes de la polla. Contexto extra: ${datos}`
}
