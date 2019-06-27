#!/usr/bin/env node

let program = require('commander')
const {
  scan, pick, assign,
  sync, merge, diff, json2xlsx, xlsx2json,
  mergeFromXlsx, pickToXlsx
} = require('../src')
program
  .command('scan [paths...]')
  .option('--rewrite', '覆盖已有文件')
  .option('--fixjsx', '尝试整体解析JSXText')
  .option('--basejson <path>', '基于JSON中存在的插值KEY，尝试还原')
// .option('--rule <ruleName>', 'inspect a specific module rule')
// .option('--plugin <pluginName>', 'inspect a specific plugin')
// .option('--rules', 'list all module rule names')
// .option('--plugins', 'list all plugin names')
  .description('扫描指定路径，提取多语文件并替换字符串为i18n')
  .action((paths, cmd) => {
    scan(paths, cleanArgs(cmd))
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
  .command('merge [paths...]')
  .option('--out <filename>', '指定输出文件名')
  .description('合并多语文件到第一个，不会新增key')
  .action((paths, cmd) => {
    merge(paths, cleanArgs(cmd))
  })
program
  .command('assign [paths...]')
  .option('--out <filename>', '指定输出文件名')
  .description('合并所有多语文件，合并后默认输出到第一个文件')
  .action((paths, cmd) => {
    assign(paths, cleanArgs(cmd))
  })

program
  .command('diff [paths...]')
  .option('--left', '输出相对左边的diff')
  .option('--right', '输出相对右边的diff')
  .option('--out <filename>', '指定输出文件名')
  .description('比较两个多语文件，将差异输出到新文件')
  .action((paths, cmd) => {
    diff(paths, cleanArgs(cmd))
  })
program
  .command('pick [paths...]')
  .option('--out <filename>', '指定输出文件名')
  .option('--type <type>', '指定提取的词条类型(默认中文)')
  .description('提取多个多语文件中的英文')
  .action((paths, cmd) => {
    pick(paths, cleanArgs(cmd))
  })

program
  .command('xlsx2json <path>')
  .description('将xlsx多语文件转化为json')
  .action((paths, cmd) => {
    xlsx2json(paths, cleanArgs(cmd))
  })

program
  .command('json2xlsx <path>')
  .option('--out <xlsxPath>', '指定输出xlsx位置')
  .description('将json多语文件转化为xlsx')
  .action((paths, cmd) => {
    json2xlsx(paths, cleanArgs(cmd))
  })

program.parse(process.argv)

function cleanArgs (cmd) {
  const args = {}
  cmd.options.forEach(o => {
    const key = o.long.replace(/^--/, '')
    // if an option is not present and Command has a method with the same name
    // it should not be copied
    if (typeof cmd[key] !== 'function') {
      args[key] = cmd[key]
    }
  })
  return args
}
