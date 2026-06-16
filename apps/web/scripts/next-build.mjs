/**
 * Wrapper de `next build` para monorepos npm.
 * Evita que Next intente parchear el lockfile (falla con ENOWORKSPACES en workspaces).
 */
import { spawnSync } from 'node:child_process'

process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1'

const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

process.exit(result.status ?? 1)
