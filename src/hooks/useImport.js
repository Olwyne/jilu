import JSZip from 'jszip'

const KEY = import.meta.env.VITE_TMDB_API_KEY
const GENRES_TV = { 10759: 'Action/Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime', 99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 10762: 'Enfants', 9648: 'Mystère', 10765: 'SF & Fantastique', 10764: 'Réalité', 10766: 'Feuilleton', 37: 'Western', 10768: 'Guerre & Politique' }
const GENRES_MOVIE = { 28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime', 99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantastique', 36: 'Histoire', 27: 'Horreur', 10402: 'Musique', 9648: 'Mystère', 10749: 'Romance', 878: 'Science-Fiction', 53: 'Thriller', 10752: 'Guerre', 37: 'Western' }
const BATCH = 5
const norm = s => (s || '').toLowerCase().replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[^a-z0-9]/g, '')
const slug = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const hdr = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = []; let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { vals.push(cur); cur = '' }
      else cur += ch
    }
    vals.push(cur)
    const o = {}; hdr.forEach((h, i) => o[h] = (vals[i] || '').replace(/^"|"$/g, '').trim()); return o
  })
}

function autoStatus(importedWorks, watched) {
  importedWorks.forEach(w => {
    if (!w.seasons || w.status === 'a_voir') return
    const total = w.seasons.reduce((n, s) => n + s.episodes.length, 0)
    if (total === 0) return
    const seen = w.seasons.reduce((n, s) => n + s.episodes.filter(e => watched[w.id + '-' + s.n + '-' + e.n]).length, 0)
    if (seen >= total) w.status = 'termine'
  })
}

export function useImport(data, mutate) {
  async function importTVTime(onStatus) {
    if (!import.meta.env.VITE_TMDB_API_KEY) { onStatus('Erreur : clé TMDB manquante (VITE_TMDB_API_KEY).'); return }
    const file = await pickFile('.zip')
    if (!file) return
    onStatus('Lecture du fichier…')
    try {
      const zip = await JSZip.loadAsync(file)

      // Followed + special status
      const followedNames = new Set()
      const forLaterNames = new Set()
      const favoriteNames = new Set()
      const followedFile = zip.file('followed_tv_show.csv')
      if (followedFile) parseCSV(await followedFile.async('string')).forEach(r => { if (r.tv_show_name) followedNames.add(r.tv_show_name) })
      const specialFile = zip.file('user_show_special_status.csv')
      if (specialFile) parseCSV(await specialFile.async('string')).forEach(r => {
        if (r.status === 'for_later' && r.tv_show_name) forLaterNames.add(r.tv_show_name)
        if (r.status === 'favorite' && r.tv_show_name) favoriteNames.add(r.tv_show_name)
      })

      // Tracking history
      onStatus("Analyse de l'historique…")
      const trackFile = zip.file('tracking-prod-records-v2.csv')
      if (!trackFile) { onStatus('Erreur : tracking-prod-records-v2.csv introuvable.'); return }
      const showData = new Map()
      parseCSV(await trackFile.async('string')).forEach(r => {
        const name = r.series_name; if (!name) return
        if (followedNames.size && !followedNames.has(name)) return
        const sNum = parseInt(r.s_no), eNum = parseInt(r.ep_no)
        if (isNaN(sNum) || isNaN(eNum) || sNum < 1 || eNum < 1) return
        const watchedAt = r.created_at ? new Date(r.created_at).getTime() : Date.now()
        if (!showData.has(name)) showData.set(name, { seasons: new Map() })
        const sd = showData.get(name)
        if (!sd.seasons.has(sNum)) sd.seasons.set(sNum, new Map())
        const sm = sd.seasons.get(sNum)
        if (!sm.has(eNum)) sm.set(eNum, { watchedAt })
      })

      // Ratings
      const ratingByNorm = new Map()
      const rateFile = zip.file('tv_show_rate.csv')
      if (rateFile) parseCSV(await rateFile.async('string')).forEach(r => {
        const rt = Math.round(parseFloat(r.rating))
        if (!isNaN(rt) && rt >= 1 && rt <= 5) ratingByNorm.set(norm(r.tv_show_name), rt)
      })

      const watched = { ...data.watched }
      const ratings = { ...data.ratings }
      const works = { ...data.works }
      const favorites = { ...(data.favorites || {}) }
      let newImports = 0, totalEps = 0

      const applyEps = (workId, tvData, nName) => {
        tvData.seasons.forEach((epMap, sNum) => {
          epMap.forEach(({ watchedAt }, eNum) => {
            const key = workId + '-' + sNum + '-' + eNum
            if (!watched[key]) { watched[key] = watchedAt; totalEps++ }
          })
          const r = ratingByNorm.get(nName)
          if (r && !ratings['s:' + workId + '-' + sNum]) ratings['s:' + workId + '-' + sNum] = r
        })
      }

      const showNames = Array.from(showData.keys())
      const existingByTmdb = new Map(Object.values(works).filter(w => w.tmdbId).map(w => [w.tmdbId, w]))

      for (let i = 0; i < showNames.length; i += BATCH) {
        onStatus(`Recherche TMDB… ${Math.min(i + BATCH, showNames.length)}/${showNames.length}`)
        await Promise.all(showNames.slice(i, i + BATCH).map(async showName => {
          const tvData = showData.get(showName)
          const nName = norm(showName)
          try {
            const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${KEY}&query=${encodeURIComponent(showName)}&language=fr-FR&page=1`)
            if (!res.ok) return
            const { results } = await res.json()
            const hit = results && results[0]; if (!hit) return
            const tmdbId = String(hit.id)
            if (existingByTmdb.has(tmdbId)) { applyEps(existingByTmdb.get(tmdbId).id, tvData, nName); return }
            const workId = `tmdb-tv-${hit.id}`
            const year = hit.first_air_date ? parseInt(hit.first_air_date.slice(0, 4)) : 0
            const isAnime = (hit.genre_ids || []).includes(16) && (hit.origin_country || []).includes('JP')
            const seasons = Array.from(tvData.seasons.entries()).sort(([a], [b]) => a - b).map(([sNum, epMap]) => ({
              n: sNum, name: null,
              episodes: Array.from(epMap.entries()).sort(([a], [b]) => a - b).map(([eNum, { watchedAt }]) => ({ n: eNum, title: 'Épisode ' + eNum, air: watchedAt }))
            }))
            const newWork = {
              id: workId, source: 'tmdb', sourceId: hit.id, tmdbId,
              title: hit.name || showName, category: isAnime ? 'animes' : 'series',
              genre: GENRES_TV[hit.genre_ids?.[0]] || 'Série', year,
              status: forLaterNames.has(showName) ? 'a_voir' : 'en_cours',
              overview: hit.overview || '',
              poster: hit.poster_path ? `https://image.tmdb.org/t/p/w300${hit.poster_path}` : null,
              seasons, added: Date.now()
            }
            works[workId] = newWork
            existingByTmdb.set(tmdbId, newWork)
            applyEps(workId, tvData, nName)
            if (favoriteNames.has(showName)) favorites[workId] = true
            newImports++
          } catch (e) { console.warn('Import série:', showName, e.message) }
        }))
        await new Promise(r => setTimeout(r, 150))
      }

      // Movies
      const movieFile = zip.file('tracking-prod-records.csv')
      let newMovies = 0
      if (movieFile) {
        const movieData = new Map()
        parseCSV(await movieFile.async('string')).forEach(r => {
          const name = r.movie_name?.trim(); if (!name) return
          const ts = r.created_at ? new Date(r.created_at).getTime() : Date.now()
          if (!movieData.has(name) || movieData.get(name) > ts) movieData.set(name, ts)
        })
        const movieNames = Array.from(movieData.keys())
        for (let i = 0; i < movieNames.length; i += BATCH) {
          onStatus(`Films TMDB… ${Math.min(i + BATCH, movieNames.length)}/${movieNames.length}`)
          await Promise.all(movieNames.slice(i, i + BATCH).map(async movieName => {
            const watchedAt = movieData.get(movieName)
            try {
              const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${KEY}&query=${encodeURIComponent(movieName)}&language=fr-FR&page=1`)
              if (!res.ok) return
              const { results } = await res.json()
              const hit = results?.[0]; if (!hit) return
              const workId = `tmdb-movie-${hit.id}`
              if (works[workId]) return
              works[workId] = {
                id: workId, source: 'tmdb', sourceId: hit.id, tmdbId: 'm' + hit.id,
                title: hit.title || movieName, category: 'films',
                genre: GENRES_MOVIE[hit.genre_ids?.[0]] || 'Film',
                year: hit.release_date ? parseInt(hit.release_date.slice(0, 4)) : 0,
                status: 'termine', overview: hit.overview || '',
                poster: hit.poster_path ? `https://image.tmdb.org/t/p/w300${hit.poster_path}` : null,
                seasons: null, release: watchedAt, added: Date.now()
              }
              newMovies++
            } catch (e) { console.warn('Import film:', movieName, e.message) }
          }))
          await new Promise(r => setTimeout(r, 150))
        }
      }

      await mutate({ works, watched, ratings, favorites })
      onStatus(`✓ ${newImports} série${newImports !== 1 ? 's' : ''}, ${totalEps} épisode${totalEps !== 1 ? 's' : ''}, ${newMovies} film${newMovies !== 1 ? 's' : ''} importé${newMovies !== 1 ? 's' : ''}.`)
    } catch (e) { onStatus('Erreur : ' + e.message) }
  }

  async function importTVTimeOut(onStatus) {
    if (!import.meta.env.VITE_TMDB_API_KEY) { onStatus('Erreur : clé TMDB manquante (VITE_TMDB_API_KEY).'); return }
    const file = await pickFile('.zip')
    if (!file) return
    onStatus('Lecture du fichier…')
    const STATUS_MAP = { up_to_date: 'en_cours', continuing: 'en_cours', watch_later: 'a_voir', not_started_yet: 'a_voir', stopped: 'abandonne' }
    try {
      const zip = await JSZip.loadAsync(file)
      const seriesJsonFile = zip.file(/^tvtime-series-.*\.json$/)[0]
      if (!seriesJsonFile) { onStatus('Erreur : tvtime-series-*.json introuvable.'); return }

      const watched = { ...data.watched }
      const works = { ...data.works }
      const favorites = { ...(data.favorites || {}) }
      const existingByTmdb = new Map(Object.values(works).filter(w => w.tmdbId).map(w => [w.tmdbId, w]))
      let newImports = 0, totalEps = 0, newMovies = 0

      const series = JSON.parse(await seriesJsonFile.async('string'))
      for (let i = 0; i < series.length; i += BATCH) {
        onStatus(`Séries… ${Math.min(i + BATCH, series.length)}/${series.length}`)
        await Promise.all(series.slice(i, i + BATCH).map(async show => {
          const tvdbId = show.id?.tvdb
          try {
            let hit = null
            if (tvdbId) {
              const res = await fetch(`https://api.themoviedb.org/3/find/${tvdbId}?api_key=${KEY}&external_source=tvdb_id&language=fr-FR`)
              if (res.ok) { const d = await res.json(); hit = (d.tv_results || [])[0] }
            }
            const title = hit?.name || show.title; if (!title) return
            const workId = hit ? `tmdb-tv-${hit.id}` : slug(title)
            const tmdbId = hit ? String(hit.id) : null
            let work = tmdbId ? existingByTmdb.get(tmdbId) : works[workId]
            if (!work) {
              const isAnime = hit && (hit.genre_ids || []).includes(16) && (hit.origin_country || []).includes('JP')
              const seasons = (show.seasons || []).map(s => ({
                n: s.number, name: null,
                episodes: (s.episodes || []).map(e => ({ n: e.number, title: e.name || ('Épisode ' + e.number), air: e.watched_at ? new Date(e.watched_at).getTime() : Date.now() }))
              }))
              work = {
                id: workId, source: 'tmdb', sourceId: hit?.id, tmdbId,
                title, category: isAnime ? 'animes' : 'series',
                genre: GENRES_TV[hit?.genre_ids?.[0]] || 'Série',
                year: hit ? parseInt((hit.first_air_date || '').slice(0, 4)) || 0 : 0,
                status: STATUS_MAP[show.status] || 'en_cours',
                overview: hit?.overview || '',
                poster: hit?.poster_path ? `https://image.tmdb.org/t/p/w300${hit.poster_path}` : null,
                seasons, added: Date.now()
              }
              works[workId] = work
              if (tmdbId) existingByTmdb.set(tmdbId, work)
              newImports++
            }
            if (show.is_favorite) favorites[work.id] = true
            ;(show.seasons || []).forEach(s => (s.episodes || []).forEach(e => {
              if (!e.is_watched) return
              const key = work.id + '-' + s.number + '-' + e.number
              const ts = e.watched_at ? new Date(e.watched_at).getTime() : Date.now()
              if (!watched[key]) { watched[key] = ts; totalEps++ }
            }))
          } catch (e) { console.warn('Import Out série:', show.title, e.message) }
        }))
        await new Promise(r => setTimeout(r, 150))
      }

      const moviesFile = zip.file(/^tvtime-movies-.*\.json$/)[0]
      if (moviesFile) {
        const movies = JSON.parse(await moviesFile.async('string'))
        for (let i = 0; i < movies.length; i += BATCH) {
          onStatus(`Films… ${Math.min(i + BATCH, movies.length)}/${movies.length}`)
          await Promise.all(movies.slice(i, i + BATCH).map(async movie => {
            const imdbId = movie.id?.imdb
            try {
              let hit = null
              if (imdbId) {
                const res = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${KEY}&external_source=imdb_id&language=fr-FR`)
                if (res.ok) { const d = await res.json(); hit = (d.movie_results || [])[0] }
              }
              if (!hit && movie.title) {
                const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${KEY}&query=${encodeURIComponent(movie.title)}&language=fr-FR`)
                if (res.ok) { const d = await res.json(); hit = d.results?.[0] }
              }
              const title = hit?.title || movie.title; if (!title) return
              const workId = hit ? `tmdb-movie-${hit.id}` : slug(title)
              if (works[workId]) return
              const watchedAt = movie.watched_at ? new Date(movie.watched_at).getTime() : Date.now()
              works[workId] = {
                id: workId, source: 'tmdb', sourceId: hit?.id, tmdbId: hit ? 'm' + hit.id : null,
                title, category: 'films',
                genre: GENRES_MOVIE[hit?.genre_ids?.[0]] || 'Film',
                year: hit ? parseInt((hit.release_date || '').slice(0, 4)) || 0 : movie.year || 0,
                status: 'termine', overview: hit?.overview || '',
                poster: hit?.poster_path ? `https://image.tmdb.org/t/p/w300${hit.poster_path}` : null,
                seasons: null, release: watchedAt, added: Date.now()
              }
              newMovies++
            } catch (e) { console.warn('Import Out film:', movie.title, e.message) }
          }))
          await new Promise(r => setTimeout(r, 150))
        }
      }

      await mutate({ works, watched, ratings, favorites })
      onStatus(`✓ ${newImports} série${newImports !== 1 ? 's' : ''}, ${totalEps} épisode${totalEps !== 1 ? 's' : ''}, ${newMovies} film${newMovies !== 1 ? 's' : ''} importé${newMovies !== 1 ? 's' : ''}.`)
    } catch (e) { onStatus('Erreur : ' + e.message) }
  }

  return { importTVTime, importTVTimeOut }
}

function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = accept
    input.onchange = e => resolve(e.target.files[0] || null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}
