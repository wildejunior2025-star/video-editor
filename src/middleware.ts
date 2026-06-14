import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isLogin = path === '/login'
  const isApi = path.startsWith('/api')

  // Redireciona para login se não autenticado
  if (!user && !isLogin && !isApi) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Bloqueia API sem autenticação (exceto servir vídeos)
  if (!user && isApi && !path.startsWith('/api/video')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Se já logado, vai para home
  if (user && isLogin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
