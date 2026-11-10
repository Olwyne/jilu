import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { pressable } from '../../lib/a11y'
import Card from '../ui/Card'
import Button from '../ui/Button'

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

// timeToBeat (facultatif) : durées estimées en heures par IGDB, { main, extra, full }
export default function GamePanel({ workId, game, timeToBeat, onAddMinutes, onToggleTier }) {
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
  return (
    <Card strong pad="md" style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>{t('game.title')}</h2>

      {/* Total */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, marginBottom: 20 }}>
        {formatDuration(totalMinutes)}
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-muted)', marginLeft: 10 }}>{t('game.played')}</span>
      </div>

      {/* Chrono */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: '14px 16px', borderRadius: 13, background: 'var(--color-chip-bg)', border: '1px solid var(--color-border)' }}>
        <Button size="sm" variant={timerRunning ? 'primary' : 'secondary'} style={{ minWidth: 80 }} onClick={timerRunning ? stopTimer : startTimer}>
          {timerRunning ? t('game.timerStop') : t('game.timerStart')}
        </Button>
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
          type="number" min="0" placeholder="0h" aria-label={t('game.hours')}
          value={manualH} onChange={(e) => setManualH(e.target.value)}
          style={inputStyle}
        />
        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>h</span>
        <input
          type="number" min="0" max="59" placeholder="0min" aria-label={t('game.minutes')}
          value={manualM} onChange={(e) => setManualM(e.target.value)}
          style={inputStyle}
        />
        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>min</span>
        <Button size="sm" variant="primary" onClick={applyManual}>+ {t('game.add')}</Button>
        <Button size="sm" variant="secondary" onClick={subtractManual}>− {t('game.subtract')}</Button>
      </div>

      {/* Tiers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TIERS.map(([key, label]) => {
          const on = !!(g.done && g.done[key])
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
              <div {...pressable(() => onToggleTier(workId, key), { role: 'checkbox', checked: on, label })} style={{ width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', color: 'var(--color-on-green)', background: on ? 'var(--color-green)' : 'transparent', border: `2px solid ${on ? 'var(--color-green)' : 'var(--color-check-border)'}` }}>{on ? '✓' : ''}</div>
              <span style={{ fontWeight: 600, fontSize: 14.5, flex: 1, textDecoration: on ? 'line-through' : 'none', color: on ? 'var(--color-muted)' : 'inherit' }}>{label}</span>
              {timeToBeat?.[key] && <span title={t('game.estimateSource')} style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('game.estimate', { count: timeToBeat[key] })}</span>}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
