import { hash } from './domain'

const POSTERS = [
  ['#3a2d6b', '#8b6dff'], ['#6b2d4f', '#ff5c8a'], ['#1f4d5c', '#38bdf8'], ['#5c3a1f', '#ffb24b'],
  ['#2d5c3a', '#4ade80'], ['#4a1f5c', '#c46dff'], ['#5c1f2d', '#ff6d6d'], ['#1f3a5c', '#6d9cff'],
  ['#5c4a1f', '#ffd76d'], ['#2d1f5c', '#8b6dff'], ['#1f5c4a', '#4addb0'], ['#5c2d1f', '#ff8b6d']
]

export function posterGradient(id) {
  const [from, to] = POSTERS[hash(id) % POSTERS.length]
  return { from, to }
}
