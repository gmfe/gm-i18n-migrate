#!/usr/bin/env node

let program = require('commander');
const {run} = require('../src')
program
    .command('scan [paths...]')
    .option('--rewrite','覆盖已有文件')
    // .option('--rule <ruleName>', 'inspect a specific module rule')
    // .option('--plugin <pluginName>', 'inspect a specific plugin')
    // .option('--rules', 'list all module rule names')
    // .option('--plugins', 'list all plugin names')
    .description('扫描指定路径，提取资源文件并替换字符串为i18n')
    .action((paths, cmd) => {
        run(paths, cleanArgs(cmd))
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
