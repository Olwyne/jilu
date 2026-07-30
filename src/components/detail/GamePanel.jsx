import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

function getMinutes(game) {
  if (!game) return 0
  if (game.minutes != null) return game.minutes
  return (game.hours || 0) * 60
}

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

export default function GamePanel({ workId, game, onAddMinutes, onToggleTier }) {
  const { t } = useTranslation()
  const TIERS = [
    ['main', t('game.main')],
    ['extra', t('game.extra')],
    ['full', t('game.full')],
  ]
  const g = game || { minutes: 0, done: {} }
  const totalMinutes = getMinutes(g)

  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)

  const [manualH, setManualH] = useState('')
  const [manualM, setManualM] = useState('')

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStart) / 1000))
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [timerRunning, timerStart])

  function startTimer() {
    setTimerStart(Date.now())
    setElapsed(0)
    setTimerRunning(true)
  }

  function stopTimer() {
    setTimerRunning(false)
    const mins = Math.floor(elapsed / 60)
    if (mins > 0) onAddMinutes(workId, mins)
    setElapsed(0)
    setTimerStart(null)
  }

  function formatElapsed(secs) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function applyManual() {
    const h = parseInt(manualH, 10) || 0
    const m = parseInt(manualM, 10) || 0
    const delta = h * 60 + m
    if (delta > 0) onAddMinutes(workId, delta)
    setManualH('')
    setManualM('')
  }

  function subtractManual() {
    const h = parseInt(manualH, 10) || 0
    const m = parseInt(manualM, 10) || 0
    const delta = h * 60 + m
    if (delta > 0) onAddMinutes(workId, -delta)
    setManualH('')
    setManualM('')
  }

  const inputStyle = {
    width: 52, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--color-border-btn)',
    background: 'var(--color-bg)', color: 'inherit', fontSize: 14, textAlign: 'center',
    outline: 'none',
  }
  const btnStyle = (accent) => ({
    padding: '7px 14px', borderRadius: 9, border: '1px solid var(--color-border-btn)',
    background: accent ? 'var(--color-accent)' : 'var(--color-chip-bg)',
    color: accent ? '#fff' : 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  })

  return (
    <div style={{ border: '1px solid var(--color-border-btn)', borderRadius: 18, background: 'var(--color-surface)', padding: 22, marginBottom: 22 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>{t('game.title')}</h3>

      {/* Total */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, marginBottom: 20 }}>
        {formatDuration(totalMinutes)}
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-muted)', marginLeft: 10 }}>{t('game.played')}</span>
      </div>

      {/* Chrono */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: '14px 16px', borderRadius: 13, background: 'var(--color-chip-bg)', border: '1px solid var(--color-border)' }}>
        <button
          type="button"
          onClick={timerRunning ? stopTimer : startTimer}
          style={{ ...btnStyle(timerRunning), minWidth: 80 }}
        >
          {timerRunning ? t('game.timerStop') : t('game.timerStart')}
        </button>
        {timerRunning && (
          <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: 'var(--color-accent)' }}>
            {formatElapsed(elapsed)}
          </span>
        )}
        {!timerRunning && elapsed === 0 && (
          <span style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>{t('game.timerHint')}</span>
        )}
      </div>

      {/* Manual entry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        <input
          type="number" min="0" placeholder="0h"
          value={manualH} onChange={(e) => setManualH(e.target.value)}
          style={inputStyle}
        />
        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>h</span>
        <input
          type="number" min="0" max="59" placeholder="0min"
          value={manualM} onChange={(e) => setManualM(e.target.value)}
          style={inputStyle}
        />
        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>min</span>
        <button type="button" onClick={applyManual} style={btnStyle(true)}>+ {t('game.add')}</button>
        <button type="button" onClick={subtractManual} style={btnStyle(false)}>− {t('game.subtract')}</button>
      </div>

      {/* Tiers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TIERS.map(([key, label]) => {
          const on = !!(g.done && g.done[key])
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
              <div onClick={() => onToggleTier(workId, key)} style={{ width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', color: '#fff', background: on ? 'var(--color-green)' : 'transparent', border: `2px solid ${on ? 'var(--color-green)' : 'var(--color-check-border)'}` }}>{on ? '✓' : ''}</div>
              <span style={{ fontWeight: 600, fontSize: 14.5, flex: 1, textDecoration: on ? 'line-through' : 'none', color: on ? 'var(--color-muted)' : 'inherit' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
