import styles from './Button.module.css'

const cx = (...parts) => parts.filter(Boolean).join(' ')

// Real <button> with the app's four intents. Layout (flex, margins, width) goes through `style`;
// colour, padding, radius and states belong to the variant and size.
export default function Button({ variant = 'secondary', size = 'md', block, busy, className, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      className={cx(styles.btn, styles[variant], styles[size], block && styles.block, className)}
      {...rest}
    />
  )
}
