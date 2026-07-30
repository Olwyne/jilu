import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'

export default function WorkPreviewModal({ work, onAdd, onClose }) {
  const { t } = useTranslation()

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, background: 'var(--color-modal-bg, var(--color-bg))', border: '1px solid var(--color-border-btn)', borderRadius: 22, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}
      >
        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          <PosterBox id={work.id} title={work.title} poster={work.poster} width={100} height={148} radius={13} fontSize={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted-2)', marginBottom: 6 }}>
              {t('cat.' + work.category)}{work.year ? ` · ${work.year}` : ''}{work.genre ? ` · ${work.genre}` : ''}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '0 0 12px', lineHeight: 1.25 }}>{work.title}</h2>
            {work.overview && (
              <p style={{ fontSize: 13.5, color: 'var(--color-muted)', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {work.overview}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid var(--color-border-btn)', background: 'transparent', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('preview.close')}
          </button>
          <button
            type="button"
            onClick={() => { onAdd(work); onClose() }}
            style={{ flex: 2, padding: '11px 0', borderRadius: 12, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('preview.add')}
          </button>
        </div>
      </div>
    </div>
  )
}
