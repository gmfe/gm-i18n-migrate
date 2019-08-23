#!/usr/bin/env node

let program = require('commander')
const {
  scan, pick, sync, update, check,
  mergeFromXlsx, pickToXlsx, assignToXlsx
} = require('../src')
program
  .command('scan [paths...]')
  .option('--rewrite', '覆盖已有文件')
  .option('--root', '贪婪模式')
  .description('扫描指定路径，提取多语文件并替换字符串为i18n')
  .action((paths, cmd) => {
    scan(paths, cleanArgs(cmd))
  })
program
  .command('check [paths...]')
  .description('检查多语语法是否正确')
  .action((paths, cmd) => {
    check(paths, cleanArgs(cmd))
  })

program
  .command('sync [paths...]')
  .option('--lib', '库文件的多语')
  .description('提取paths中的词条，同步到多语文件')
  .action((paths, cmd) => {
    sync(paths, cleanArgs(cmd))
  })
program
  .command('pick-xlsx [jsonPath]')
  .option('--type <type>', '全部词条生成excel')
  .option('--out <out>', '输出excel路径')
  .description('将未翻译的词条生成excel')
  .action((jsonPath, cmd) => {
    pickToXlsx(jsonPath, cleanArgs(cmd))
  })

program
  .command('merge-xlsx [xlsxPath] [jsonPath]')
  .description('将excel文件合并到多语文件')
  .action((xlsxPath, jsonPath, cmd) => {
    mergeFromXlsx(xlsxPath, jsonPath, cleanArgs(cmd))
  })
program
  .command('assign-xlsx [xlsxPaths...]')
  .description('将excel文件合并到一个')
  .action((xlsxPaths, cmd) => {
    assignToXlsx(xlsxPaths, cleanArgs(cmd))
  })
program
  .command('pick')
  .option('--out <jsonDir>', '输出的json目录')
  .description('提取出当前项目的多语')
  .action((cmd) => {
    pick(cleanArgs(cmd))
  })
program
  .command('update')
  .description('根据pick的结果更新当前目录其他多语json')
  .action((cmd) => {
    update(cleanArgs(cmd))
  })

const { version } = require('../package.json')
program.version(version)
program.parse(process.argv)

function cleanArgs (cmd) {
  const args = {}
  cmd.options.forEach(o => {
    const key = o.long.replace(/^--/, '')
    // if an option is not present and Command has a method with the same name
    // it should not be copied
    if (typeof cmd[key] !== 'function' && cmd[key] !== undefined) {
      args[key] = cmd[key]
    }
  })
  return args
}
