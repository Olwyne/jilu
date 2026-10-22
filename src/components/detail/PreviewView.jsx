import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import Button from '../ui/Button'

export default function PreviewView({ works, onAddWork }) {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const work = state?.work

  if (!work) { navigate('/dashboard', { replace: true }); return null }

  const alreadyAdded = !!works[work.id]

  async function handleAdd() {
    if (alreadyAdded) { navigate('/work/' + work.id); return }
    await onAddWork(work)
    navigate('/work/' + work.id)
  }

  return (
    <div>
      <Button variant="secondary" size="sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
        ← {t('preview.back')}
      </Button>

      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginBottom: 28 }}>
        <PosterBox id={work.id} title={work.title} poster={work.poster} width={150} height={220} radius={18} fontSize={52} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, color: 'var(--color-muted-2)', marginBottom: 8 }}>
            {t('cat.' + work.category)}{work.year ? ` · ${work.year}` : ''}{work.genre ? ` · ${work.genre}` : ''}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, margin: '0 0 14px' }}>{work.title}</h2>
          {work.overview && (
            <p style={{ color: '#b9b9c8', fontSize: 15, lineHeight: 1.55, maxWidth: 560, margin: '0 0 20px' }}>{work.overview}</p>
          )}
          <Button variant="primary" size="lg" onClick={handleAdd}>
            {alreadyAdded ? t('preview.openInLibrary') : t('preview.add')}
          </Button>
        </div>
      </div>
    </div>
  )
}
