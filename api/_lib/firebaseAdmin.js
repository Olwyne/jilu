// Initialisation Firebase Admin + transport HTTP serveur des modules de catalogue, partagée par les fonctions api/.
import { initAdminApp } from './adminApp.js'
import { createServerHttp } from './serverHttp.js'
import { setHttp } from '../../src/catalog/http.js'

export function initAdmin() {
  initAdminApp()
  setHttp(createServerHttp())
}
