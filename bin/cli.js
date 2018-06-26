#!/usr/bin/env node

let program = require('commander');
const {
    scan,
    sync,merge,diff
} = require('../src')
program
    .command('scan [paths...]')
    .option('--rewrite', '覆盖已有文件')
    .option('--fixjsx', '尝试整体解析JSXText')
    // .option('--rule <ruleName>', 'inspect a specific module rule')
    // .option('--plugin <pluginName>', 'inspect a specific plugin')
    // .option('--rules', 'list all module rule names')
    // .option('--plugins', 'list all plugin names')
    .description('扫描指定路径，提取资源文件并替换字符串为i18n')
    .action((paths, cmd) => {
        scan(paths, cleanArgs(cmd))
    })

program
    .command('sync [paths...]')
    .description('将资源文件与指定路径文件中的i18n信息同步')
    .action((paths, cmd) => {
        sync(paths, cleanArgs(cmd))
    })

program
    .command('merge [paths...]')
    .option('--out <filename>', '指定输出文件名')
    .description('合并所有资源文件，合并后输出到新文件')
    .action((paths, cmd) => {
        merge(paths, cleanArgs(cmd))
    })

program
    .command('diff [paths...]')
    .option('--out <filename>', '指定输出文件名')
    .description('比较两个资源文件，将差异输出到新文件')
    .action((paths, cmd) => {
        diff(paths, cleanArgs(cmd))
    })

program.parse(process.argv)

function cleanArgs(cmd) {
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
