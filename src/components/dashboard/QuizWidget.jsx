import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { getTodayQuestion, getTodayKey } from '../../lib/quizQuestions'

const MAX_LEADERS = 10

export default function QuizWidget({ user, handle }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const todayKey = getTodayKey()
  const q = getTodayQuestion()
  const question = q[lang]

  const [phase, setPhase] = useState('idle') // idle | playing | done
  const [selected, setSelected] = useState(null)
  const [timeMs, setTimeMs] = useState(null)
  const [leaders, setLeaders] = useState([])
  const [loadingLeaders, setLoadingLeaders] = useState(false)
  const startRef = useRef(null)
  const timerRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'quiz', todayKey, 'scores', user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setSelected(d.answer)
        setTimeMs(d.timeMs)
        setPhase('done')
        fetchLeaders()
      }
    }).catch(() => { /* permissions not deployed yet — stay idle */ })
  }, [user, todayKey])

  useEffect(() => {
    if (phase === 'playing') {
      startRef.current = Date.now()
      timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  async function fetchLeaders() {
    setLoadingLeaders(true)
    try {
      const snap = await getDocs(collection(db, 'quiz', todayKey, 'scores'))
      const sorted = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => {
          if (a.correct && !b.correct) return -1
          if (!a.correct && b.correct) return 1
          return a.timeMs - b.timeMs
        })
        .slice(0, MAX_LEADERS)
      setLeaders(sorted)
    } catch { /* silently ignore */ }
    setLoadingLeaders(false)
  }

  function startQuiz() {
    setPhase('playing')
    setElapsed(0)
  }

  async function pick(idx) {
    if (phase !== 'playing' || !user) return
    clearInterval(timerRef.current)
    const ms = Date.now() - startRef.current
    setSelected(idx)
    setTimeMs(ms)
    setPhase('done')
    await setDoc(doc(db, 'quiz', todayKey, 'scores', user.uid), {
      handle: handle || user.uid,
      answer: idx,
      correct: idx === question.a,
      timeMs: ms,
      ts: Date.now(),
    })
    fetchLeaders()
  }

  const correct = selected === question.a
  const btnBase = { padding: '10px 14px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }

  function optionStyle(idx) {
    if (phase !== 'done') return { ...btnBase, background: 'var(--color-chip-bg)', color: 'inherit' }
    if (idx === question.a) return { ...btnBase, background: 'rgba(74,222,128,.15)', border: '1px solid #4ade80', color: '#4ade80', fontWeight: 600 }
    if (idx === selected) return { ...btnBase, background: 'rgba(239,68,68,.1)', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 600 }
    return { ...btnBase, background: 'var(--color-chip-bg)', color: 'var(--color-muted)', opacity: 0.5 }
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, background: 'var(--color-surface)', padding: 22, marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{t('quiz.title')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-muted-3)', marginTop: 2 }}>{t('quiz.subtitle')}</div>
        </div>
        {phase === 'playing' && (
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color: 'var(--color-accent)' }}>
            {(elapsed / 1000).toFixed(1)}s
          </div>
        )}
        {phase === 'done' && timeMs != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: correct ? '#4ade80' : '#ef4444' }}>
              {correct ? t('quiz.correct') : t('quiz.wrong')}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted-3)' }}>{(timeMs / 1000).toFixed(2)}s</div>
          </div>
        )}
      </div>

      {phase === 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, fontSize: 14.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>{t('quiz.hint')}</div>
          <button
            type="button"
            onClick={startQuiz}
            style={{ padding: '11px 22px', borderRadius: 12, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {t('quiz.play')}
          </button>
        </div>
      )}

      {(phase === 'playing' || phase === 'done') && (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>{question.q}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: phase === 'done' ? 20 : 0 }}>
            {question.o.map((opt, idx) => (
              <button key={idx} type="button" onClick={() => pick(idx)} disabled={phase === 'done'} style={optionStyle(idx)}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'done' && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted-2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
            {t('quiz.leaderboard')}
          </div>
          {loadingLeaders
            ? <div style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>{t('quiz.loading')}</div>
            : leaders.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>{t('quiz.noScores')}</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {leaders.map((l, i) => {
                    const isMe = user && l.uid === user.uid
                    return (
                      <div key={l.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: isMe ? 'rgba(var(--color-accent-rgb, 111,80,255),.12)' : 'var(--color-surface-row, var(--color-chip-bg))', border: isMe ? '1px solid var(--color-accent)' : '1px solid transparent' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : 'var(--color-muted)', minWidth: 22 }}>
                          {i + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: isMe ? 700 : 500 }}>{l.handle}</span>
                        <span style={{ fontSize: 13, color: l.correct ? '#4ade80' : '#ef4444', fontWeight: 600 }}>
                          {l.correct ? (l.timeMs / 1000).toFixed(2) + 's' : t('quiz.incorrect')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
          }
        </div>
      )}
    </div>
  )
}
