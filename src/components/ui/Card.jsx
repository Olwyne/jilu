import styles from './Card.module.css'

const cx = (...parts) => parts.filter(Boolean).join(' ')

// The app's one surface: tinted fill, hairline border, 18px radius (16px when `dense`, for list rows).
// pad: 'md' (22px) | 'sm' (18px 20px) | undefined (caller sets padding via style). `strong` uses the firmer border.
export default function Card({ pad, dense, strong, clip, className, as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={cx(styles.card, dense && styles.dense, strong && styles.strong, clip && styles.clip, pad === 'md' && styles.padMd, pad === 'sm' && styles.padSm, className)}
      {...rest}
    />
  )
}
