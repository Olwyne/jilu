import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function WorkPreviewModal({ work, onAdd, onClose }) {
  const { t } = useTranslation()

  return (
    <Modal onClose={onClose} label={work.title} backdropStyle={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} panelStyle={{ width: '100%', maxWidth: 460, background: 'var(--color-modal-bg, var(--color-bg))', border: '1px solid var(--color-border-btn)', borderRadius: 22, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
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
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>
            {t('preview.close')}
          </Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={() => { onAdd(work); onClose() }}>
            {t('preview.add')}
          </Button>
        </div>
      
    </Modal>
  )
}
