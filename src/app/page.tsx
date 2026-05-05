import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function Home() {
  // Redirect authenticated users away from the landing
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users').select('id').eq('id', user.id).maybeSingle()
    redirect(profile ? '/dashboard' : '/onboarding')
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-3xl font-black tracking-wider text-[#00A86B]">
          MUNDIALAZO
        </span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold border border-white/20 rounded-lg hover:bg-white/10 transition"
          >
            Entrar
          </Link>
          <Link
            href="/grupos/nuevo"
            className="px-4 py-2 text-sm font-semibold bg-[#00A86B] text-black rounded-lg hover:bg-[#007A4D] transition"
          >
            Crear polla →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-block px-4 py-1 mb-6 text-xs font-bold tracking-widest text-[#00A86B] border border-[#00A86B]/40 rounded-full bg-[#00A86B]/10 uppercase">
          Mundial 2026 · USA / México / Canadá
        </div>

        <h1 className="text-6xl md:text-8xl font-black leading-none tracking-tight mb-6">
          LA POLLA DEL<br />
          <span className="text-[#00A86B]">GRUPO</span> EN<br />
          <span className="text-[#D4A017]">30 SEGUNDOS</span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
          Crea tu polla mundialera, invita por WhatsApp y compite con IA.
          Para futboleros y no futboleros.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/grupos/nuevo"
            className="px-8 py-4 text-lg font-bold bg-[#00A86B] text-black rounded-xl hover:bg-[#007A4D] transition"
          >
            Crear mi polla gratis →
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 text-lg font-bold border border-white/20 rounded-xl hover:bg-white/10 transition"
          >
            Ya tengo grupo
          </Link>
        </div>

        {/* STATS */}
        <div className="flex gap-12 mt-16 text-center">
          <div>
            <div className="text-4xl font-black text-[#00A86B]">104</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Partidos</div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#00A86B]">48</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Selecciones</div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#00A86B]">∞</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Grupos</div>
          </div>
        </div>
      </section>

      {/* DIFERENCIADORES */}
      <section className="px-6 py-16 border-t border-white/10 max-w-5xl mx-auto">
        <div className="text-xs font-bold tracking-widest text-[#00A86B] uppercase mb-3">
          Por qué Mundialazo
        </div>
        <h2 className="text-4xl font-black mb-12">
          TODO LO QUE LAS <span className="text-[#00A86B]">OTRAS NO TIENEN</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '💬', title: 'WhatsApp nativo', desc: 'Pronostica directo en WhatsApp. Sin instalar nada.', badge: 'Solo en Mundialazo' },
            { icon: '🤖', title: 'IA Copiloto', desc: 'La IA analiza cada partido y te ayuda si no sabes de fútbol.', badge: 'IA integrada' },
            { icon: '⚡', title: 'Power-ups', desc: 'Doble Golpe, Cábala, Anti-Favorito. Estrategia real.', badge: 'Gamificación' },
            { icon: '🏆', title: 'Ranking en vivo', desc: 'Se actualiza solo cuando termina cada partido.', badge: 'Tiempo real' },
            { icon: '🏷️', title: 'White-label', desc: 'Tu empresa con su logo y colores. Listo en 5 minutos.', badge: 'Para empresas' },
            { icon: '💰', title: 'Premios automáticos', desc: 'Khipu deposita directo. Sin planillas ni transfers manuales.', badge: 'Pagos' },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#00A86B]/40 transition"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">{f.desc}</p>
              <span className="text-xs font-bold text-[#00A86B] bg-[#00A86B]/10 px-3 py-1 rounded-full">
                {f.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="px-6 py-16 border-t border-white/10 max-w-5xl mx-auto">
        <h2 className="text-4xl font-black mb-12">
          LISTO EN <span className="text-[#00A86B]">3 PASOS</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n: '01', title: 'Crea o únete', desc: 'Solo tu nombre y WhatsApp. En 20 segundos estás adentro.' },
            { n: '02', title: 'Pronostica', desc: 'Desde la web o por WhatsApp. La IA te ayuda si no sabes de fútbol.' },
            { n: '03', title: 'Gana', desc: 'Premios automáticos por fase y al final. El dinero llega a tu cuenta.' },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="text-7xl font-black text-[#00A86B]/20 leading-none">{s.n}</div>
              <div className="text-xl font-bold mt-[-16px] mb-3">{s.title}</div>
              <div className="text-sm text-gray-400 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-6 py-20 border-t border-[#00A86B]/20 bg-[#00A86B]/5 text-center">
        <h2 className="text-4xl md:text-5xl font-black mb-4">
          EL MUNDIAL EMPIEZA EN JUNIO.<br />
          <span className="text-[#00A86B]">TU POLLA, HOY.</span>
        </h2>
        <p className="text-gray-400 mb-8">Gratis para grupos de hasta 20 personas.</p>
        <Link
          href="/grupos/nuevo"
          className="inline-block px-10 py-5 text-xl font-bold bg-[#00A86B] text-black rounded-xl hover:bg-[#007A4D] transition"
        >
          Crear mi polla gratis →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-gray-600 text-sm">
        <div className="text-2xl font-black text-[#00A86B] mb-2">MUNDIALAZO</div>
        Chile 🇨🇱 · Mundial 2026 🏆
      </footer>

    </main>
  )
}
