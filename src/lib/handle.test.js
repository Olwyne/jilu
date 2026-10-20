import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map()
let denyNext = false
vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, col, id) => ({ key: `${col}/${id}` }),
  getDoc: async (ref) => ({ exists: () => store.has(ref.key), data: () => store.get(ref.key) }),
  writeBatch: () => {
    const ops = []
    return {
      set: (ref, data) => ops.push([ref.key, data]),
      commit: async () => {
        if (denyNext) { denyNext = false; throw { code: 'permission-denied' } }
        ops.forEach(([k, d]) => store.set(k, d))
      },
    }
  },
}))

import { handleFromEmail, handleCandidate, ensureHandle } from './handle'

beforeEach(() => { store.clear(); denyNext = false })

describe('handleFromEmail', () => {
  it('prend la partie avant le @, en minuscules et nettoyée', () => {
    expect(handleFromEmail('Sophie.Martin+tv@gmail.com')).toBe('sophie_martin_tv')
    expect(handleFromEmail('élodie@x.fr')).toBe('elodie')
    expect(handleFromEmail('a_b-c@x.fr')).toBe('a_b_c')
  })
  it('tronque à 20 caractères et garantit une longueur minimale', () => {
    expect(handleFromEmail('a'.repeat(40) + '@x.fr')).toHaveLength(20)
    expect(handleFromEmail('x@y.fr')).toBe('user')
    expect(handleFromEmail('')).toBe('user')
  })
})

describe('handleCandidate', () => {
  it('ajoute un numéro sans dépasser 20 caractères', () => {
    expect(handleCandidate('sophie', 0)).toBe('sophie')
    expect(handleCandidate('sophie', 1)).toBe('sophie2')
    expect(handleCandidate('a'.repeat(20), 1)).toBe('a'.repeat(19) + '2')
  })
})

describe('ensureHandle', () => {
  const user = { uid: 'u1', email: 'sophie@gmail.com' }

  it("réserve le pseudo dérivé de l'e-mail quand le profil n'en a pas", async () => {
    expect(await ensureHandle(user, undefined)).toBe('sophie')
    expect(store.get('pseudos/sophie')).toEqual({ uid: 'u1' })
  })
  it('conserve le pseudo existant du profil et le réserve s’il est libre', async () => {
    expect(await ensureHandle(user, 'Mon_Pseudo')).toBe('mon_pseudo')
    expect(store.get('pseudos/mon_pseudo')).toEqual({ uid: 'u1' })
  })
  it('ne touche à rien si le pseudo est déjà à cet utilisateur', async () => {
    store.set('pseudos/sophie', { uid: 'u1' })
    expect(await ensureHandle(user, 'sophie')).toBe('sophie')
  })
  it('ajoute un numéro si le pseudo est pris par quelqu’un d’autre', async () => {
    store.set('pseudos/sophie', { uid: 'autre' })
    expect(await ensureHandle(user, undefined)).toBe('sophie2')
    expect(store.get('pseudos/sophie')).toEqual({ uid: 'autre' })
  })
  it('passe au suivant si une course fait refuser la création', async () => {
    denyNext = true
    expect(await ensureHandle(user, undefined)).toBe('sophie2')
  })
  it('un pseudo existant invalide est remplacé par celui de l’e-mail', async () => {
    expect(await ensureHandle(user, 'Sophie!!')).toBe('sophie')
  })
})
