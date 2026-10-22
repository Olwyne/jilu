import styles from './IconButton.module.css'

const cx = (...parts) => parts.filter(Boolean).join(' ')

// Square or round icon-only button. `label` is required: it is the accessible name.
export default function IconButton({ label, size = 'md', round, brand, className, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(styles.icon, styles[size], round && styles.round, brand && styles.brand, className)}
      {...rest}
    />
  )
}
