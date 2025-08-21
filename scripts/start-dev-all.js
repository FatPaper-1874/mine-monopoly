import { execSync } from 'child_process'
import { readdirSync } from 'fs'

// 获取所有 packages/apps 目录下的应用
const apps = readdirSync('apps', { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)

// 并行启动所有应用
apps.forEach(app => {
  console.log(`Starting ${app}...`)
  try {
    execSync(`pnpm --filter @fatpaper-monopoly/${app} run dev`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  } catch (error) {
    console.error(`Failed to start ${app}:`, error)
  }
})