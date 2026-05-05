import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code    = searchParams.get('code')
  const returnTo = searchParams.get('returnTo') ?? ''

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?error=exchange_failed', origin))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const onboardingUrl = returnTo
      ? `/onboarding?returnTo=${encodeURIComponent(returnTo)}`
      : '/onboarding'
    return NextResponse.redirect(new URL(onboardingUrl, origin))
  }

  return NextResponse.redirect(new URL(returnTo || '/dashboard', origin))
}
