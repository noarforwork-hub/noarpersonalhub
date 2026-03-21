import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json(data || [])
}

export async function POST(req: Request) {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await supabase.from('tasks').insert({
        ...body,
        user_id: user.id,
    }).select().single()

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json(data)
}

export async function PATCH(req: Request) {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })

    const { data, error } = await supabase.from('tasks').update(body).eq('id', body.id).eq('user_id', user.id).select().single()

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json(data)
}
