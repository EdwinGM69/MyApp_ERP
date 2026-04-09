import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, remember } = loginSchema.parse(body)

    const usuario = await prisma.usuario.findFirst({
      where: { email, activo: true },
      include: { empresa: true, rol: true },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const validPassword = await bcrypt.compare(password, usuario.password_hash)
    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const payload = {
      userId: usuario.id,
      empresaId: usuario.empresa_id,
      rolId: usuario.rol_id,
      email: usuario.email,
    }

    const accessToken = await signAccessToken(payload)
    const refreshToken = await signRefreshToken(payload)

    // Lookup moneda_id for moneda_default abbreviation
    const moneda = await prisma.moneda.findFirst({
      where: { 
        empresa_id: usuario.empresa_id,
        abreviatura: usuario.empresa.moneda_default
      }
    })

    const response = NextResponse.json({
      accessToken,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        avatar_url: usuario.avatar_url,
        rol: usuario.rol.nombre,
        empresa: usuario.empresa.nombre,
        empresaId: usuario.empresa_id,
        monedaDefault: usuario.empresa.moneda_default,
        monedaId: moneda?.id,
        monedaSimbolo: moneda?.simbolo || '$',
      },
    })

    // Set tokens as HttpOnly cookies
    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    }

    if (remember) {
      cookieOptions.maxAge = 60 * 60 * 24 * 7 // 7 days
    }

    response.cookies.set('access_token', accessToken, cookieOptions)
    response.cookies.set('refresh_token', refreshToken, cookieOptions)

    return response
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
