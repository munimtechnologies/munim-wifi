import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const KEYCHAIN_ACCOUNT = 'sheehanmunim'
const KEYCHAIN_SERVICE = 'npm-token-munim-wifi'

function readCommand(command, args, description) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    console.error(`Unable to read ${description}.`)
    process.exit(1)
  }
}

function resolveNpmToken() {
  if (process.env.NPM_TOKEN) return process.env.NPM_TOKEN

  if (process.platform !== 'darwin') {
    console.error('Set NPM_TOKEN before running a local release on this platform.')
    process.exit(1)
  }

  return readCommand(
    'security',
    [
      'find-generic-password',
      '-a',
      KEYCHAIN_ACCOUNT,
      '-s',
      KEYCHAIN_SERVICE,
      '-w',
    ],
    `the npm token from macOS Keychain service ${KEYCHAIN_SERVICE}`
  )
}

function resolveGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN

  return readCommand('gh', ['auth', 'token'], 'the GitHub CLI token')
}

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const semanticRelease = path.join(
  repositoryRoot,
  'node_modules',
  'semantic-release',
  'bin',
  'semantic-release.js'
)
const result = spawnSync(
  process.execPath,
  [semanticRelease, '--no-ci', ...process.argv.slice(2)],
  {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      GITHUB_TOKEN: resolveGitHubToken(),
      NPM_TOKEN: resolveNpmToken(),
    },
    stdio: 'inherit',
  }
)

if (result.error) {
  console.error(result.error.message)
}

process.exit(result.status ?? 1)
