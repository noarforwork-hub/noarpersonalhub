import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    let query = supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true })

    if (date) query = query.eq('date', date)

    const { data, error } = await query
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(req: Request) {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await supabase.from('schedules').insert({
        ...body,
        user_id: user.id,
        source: 'manual',
    }).select().single()

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req: Request) {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ok: true })
}