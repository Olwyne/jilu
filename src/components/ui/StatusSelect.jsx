import { useTranslation } from 'react-i18next'
import { STATUS } from '../../lib/domain'
import Select from './Select'

export default function StatusSelect({ value, onChange, disabled }) {
  const { t } = useTranslation()
  const options = Object.entries(STATUS).map(([key, { color }]) => ({ value: key, label: t('status.' + key), color }))
  return <Select value={value} options={options} onChange={onChange} disabled={disabled} label={t('status.label')} />
}
