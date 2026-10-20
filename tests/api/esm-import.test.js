// Vercel exécute api/*.js avec Node natif (pas Vite) : les imports doivent avoir leur extension .js
// et rien ne doit dépendre du navigateur au chargement.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'

describe('fonctions api/ sous Node natif', () => {
  for (const file of ['refresh-work', 'tmdb', 'mangadex', 'rawg', 'books', 'spotify-token']) {
    it(`api/${file}.js se charge et exporte un handler`, () => {
      const out = execFileSync('node', ['--input-type=module', '-e', `const m = await import('./api/${file}.js'); console.log(typeof m.default)`], { cwd: process.cwd(), encoding: 'utf8' })
      expect(out.trim()).toBe('function')
    })
  }
})
