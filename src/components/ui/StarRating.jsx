import styles from './StarRating.module.css'

// 1-5 star input exposed as a radio group. Cells are adjacent so hit areas stay separate on touch.
export default function StarRating({ value = 0, onChange, label, size = 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.group}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={`${n}/5`}
          className={`${styles.star} ${styles[size]} ${n <= value ? styles.on : ''}`}
          onClick={() => onChange(n)}
        >
          <span aria-hidden="true">{n <= value ? '★' : '☆'}</span>
        </button>
      ))}
    </div>
  )
}
