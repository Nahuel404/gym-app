import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.JWT_SECRET || 'fallback-secret-key'
)

const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 días en segundos

export interface User {
  id: string
  username: string
  name: string
  role: 'admin' | 'user'
}

export interface JWTPayload {
  id: string
  username: string
  name: string
  role: 'admin' | 'user'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET)

  return token
}

export async function verifySession(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export function getSessionCookie(token: string): string {
  const maxAge = SESSION_DURATION
  return `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
}
