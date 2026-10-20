// Transport HTTP des modules de catalogue.
// Navigateur : le fetch global (les adresses relatives /api/... passent par les proxys Vercel).
// Serveur : remplacé par setHttp() pour joindre directement les API amont (voir api/_lib/serverHttp.js).
let impl = (...args) => globalThis.fetch(...args)

export const http = (...args) => impl(...args)

export function setHttp(fn) {
  impl = fn
}
