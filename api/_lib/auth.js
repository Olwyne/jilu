// Utilisateur connecté d'après « Authorization: Bearer <jeton Firebase> » ; null si absent ou invalide
export async function uidFromRequest(req, verifyToken) {
  const token = /^Bearer (.+)$/.exec(req.headers?.authorization || '')?.[1]
  if (!token) return null
  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}

export function jsonBody(req) {
  if (typeof req.body !== 'string') return req.body
  try { return JSON.parse(req.body) } catch { return null }
}
