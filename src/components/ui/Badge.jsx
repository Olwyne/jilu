import styles from './Badge.module.css'

// Small status pill (default: danger fill, white text, 4.8:1). `floating` pins it to a positioned parent's corner.
export default function Badge({ floating, className, ...rest }) {
  return <span className={[styles.badge, floating && styles.floating, className].filter(Boolean).join(' ')} {...rest} />
}
