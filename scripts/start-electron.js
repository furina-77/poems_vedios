// 跨平台 Electron 启动脚本：安全清除 ELECTRON_RUN_AS_NODE
const { spawn } = require('child_process')
const path = require('path')
const electronPath = require('electron')

// 复制环境变量并删除问题变量（用 delete 而非 undefined）
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const args = [path.join(__dirname, '..')]
if (process.argv.includes('--dev')) {
  args.push('--dev')
}
args.push(...process.argv.slice(2).filter(a => a !== '--dev'))

const child = spawn(electronPath, args, { stdio: 'inherit', env })

child.on('exit', (code) => process.exit(code || 0))
