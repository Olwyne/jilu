import styles from './Chip.module.css'

const cx = (...parts) => parts.filter(Boolean).join(' ')

// Toggle pill for filters and tabs. `active` is exposed as aria-pressed.
// `count` renders a muted number after the label; floating badges are passed as children (<Badge floating />).
export default function Chip({ active = false, size = 'md', flat, count, className, type = 'button', disabled, children, ...rest }) {
  return (
    <button
      type={type}
      aria-pressed={active}
      disabled={disabled}
      className={cx(styles.chip, styles[size], flat && styles.flat, active && styles.active, className)}
      {...rest}
    >
      {children}
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </button>
  )
}
