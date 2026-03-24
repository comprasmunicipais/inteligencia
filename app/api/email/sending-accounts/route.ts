import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// ============================
// GET - listar contas
// ============================
export async function GET() {
  try {
    const supabase = createAdminClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('email_sending_accounts')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ============================
// POST - criar/atualizar conta
// ============================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const supabase = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 })
    }

    const encryptionKey = process.env.SMTP_ENCRYPTION_KEY!

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(encryptionKey, 'hex'),
      iv
    )

    let encrypted = cipher.update(body.smtp_password, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag().toString('hex')

    const encryptedPassword = `${iv.toString('hex')}:${encrypted}:${tag}`

    const { error } = await supabase
      .from('email_sending_accounts')
      .insert({
        company_id: profile.company_id,
        name: body.name,
        sender_name: body.sender_name,
        sender_email: body.sender_email,
        reply_to_email: body.reply_to_email,
        smtp_host: body.smtp_host,
        smtp_port: body.smtp_port,
        smtp_secure: body.smtp_secure,
        smtp_username: body.smtp_username,
        smtp_password_encrypted: encryptedPassword,
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
