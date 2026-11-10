// Vercel exécute api/*.js avec Node natif (pas Vite) : les imports doivent avoir leur extension .js
// et rien ne doit dépendre du navigateur au chargement. Le moteur de Vercel refuse aussi require() d'un module ES
// (ex. firebase-admin 14 -> jose 6, ERR_REQUIRE_ESM) : on le désactive pour reproduire cette contrainte.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'

describe('fonctions api/ sous Node natif', () => {
  for (const file of ['refresh-work', 'tmdb', 'mangadex', 'igdb', 'books', 'spotify-token', 'cron-refresh']) {
    it(`api/${file}.js se charge et exporte un handler`, () => {
      const out = execFileSync('node', ['--no-experimental-require-module', '--input-type=module', '-e', `const m = await import('./api/${file}.js'); console.log(typeof m.default)`], { cwd: process.cwd(), encoding: 'utf8' })
      expect(out.trim()).toBe('function')
    })
  }
})
