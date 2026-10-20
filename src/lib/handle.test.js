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

import { neutralHandle, handleCandidate, ensureHandle, HANDLE_RE } from './handle'

beforeEach(() => { store.clear(); denyNext = false })

const seq = (...values) => { let i = 0; return () => values[i++ % values.length] }

describe('neutralHandle', () => {
  it('produit un pseudo valide qui ne dépend pas de l’e-mail', () => {
    for (let i = 0; i < 50; i++) expect(neutralHandle()).toMatch(HANDLE_RE)
    expect(neutralHandle(() => 0.123456789)).toMatch(/^membre_[a-z0-9]{6}$/)
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
  const user = { uid: 'u1', email: 'sophie.martin@gmail.com' }

  it("attribue un pseudo neutre quand le profil n'en a pas, sans rien reprendre de l'e-mail", async () => {
    const handle = await ensureHandle(user, undefined)
    expect(handle).toMatch(/^membre_[a-z0-9]{6}$/)
    expect(handle).not.toContain('sophie')
    expect(store.get(`pseudos/${handle}`)).toEqual({ uid: 'u1' })
  })
  it('conserve le pseudo existant du profil et le réserve s’il est libre', async () => {
    expect(await ensureHandle(user, 'Mon_Pseudo')).toBe('mon_pseudo')
    expect(store.get('pseudos/mon_pseudo')).toEqual({ uid: 'u1' })
  })
  it('ne touche à rien si le pseudo est déjà à cet utilisateur', async () => {
    store.set('pseudos/sophie', { uid: 'u1' })
    expect(await ensureHandle(user, 'sophie')).toBe('sophie')
  })
  it('ajoute un numéro à un pseudo choisi par l’utilisateur s’il est pris par quelqu’un d’autre', async () => {
    store.set('pseudos/sophie', { uid: 'autre' })
    expect(await ensureHandle(user, 'sophie')).toBe('sophie2')
    expect(store.get('pseudos/sophie')).toEqual({ uid: 'autre' })
  })
  it('retire un autre tirage neutre si le premier pseudo est déjà pris', async () => {
    store.set('pseudos/membre_iiiiii', { uid: 'autre' }) // 0.5 -> "i" (x6)
    const random = seq(...Array(6).fill(0.5), ...Array(6).fill(0.25)) // puis 0.25 -> "9" (x6)
    expect(await ensureHandle(user, undefined, random)).toBe('membre_999999')
    expect(store.get('pseudos/membre_iiiiii')).toEqual({ uid: 'autre' })
  })
  it('retire un tirage si la création est refusée (course entre deux inscriptions)', async () => {
    denyNext = true
    const random = seq(...Array(6).fill(0.5), ...Array(6).fill(0.25))
    expect(await ensureHandle(user, undefined, random)).toBe('membre_999999')
    expect(store.has('pseudos/membre_iiiiii')).toBe(false)
  })
  it('un pseudo existant invalide est remplacé par un pseudo neutre', async () => {
    expect(await ensureHandle(user, 'Sophie!!')).toMatch(/^membre_/)
  })
})
