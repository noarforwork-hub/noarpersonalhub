import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    if (!code) return NextResponse.redirect(new URL('/tasks', req.url))

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            grant_type: 'authorization_code',
        }),
    })

    const tokens = await tokenRes.json()

    // เก็บ token ลง Supabase profile
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('cv_sections').upsert({
            section: 'google_tokens',
            content: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry: Date.now() + tokens.expires_in * 1000,
            }
        })
    }

    return NextResponse.redirect(new URL('/tasks', req.url))
}