import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Rotas sempre liberadas (Puppeteer e render interno usam scene-capture)
  const isPublic = path === '/login'
    || path.startsWith('/api/video')
    || path.startsWith('/scene-capture')
    || path.startsWith('/render-preview')

  // Sem Supabase configurado → modo local, sem autenticação
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
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
  const isApi = path.startsWith('/api')

  if (!user && !isPublic && !isApi) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!user && isApi && !isPublic) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
