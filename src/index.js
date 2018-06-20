const glob = require('glob');
const fs = require('fs-extra');
const p = require('path');
let expressionTraverse = require('./core/ExpressionTraverse')
let log = console.log.bind(console);
let config = require('./config')
const {exclude} = config;

/* 基本思路
// 源字符串
let s = `你好，${name}。欢迎来到${where}`

// name where这些变量名确定
let s = '你好，' + users[0].name + '。欢迎来到' + where.name

// 替换
let s = i18n.get('key#a',{name,where}) // 源字符串以注释形式显示   `你好，${name}。欢迎来到${where}` 

// 提供 keyStrategy 自定义key生成逻辑

// 可能还需要sourcemap，给出更详细的元信息

// 提取出的中文资源文件 
cnMap = {
    "key":{
        "a": "你好，{name}。欢迎来到 {where}!",
    }
}

// 复制一份 用来翻译
enMap = {
    "key#1": "Hello, {name}. Welcome to {where}!",
}
*/

function run(path) {
    glob(`${path}/**/*.{js,jsx}`, {
            ignore: exclude.map(pattern => `${path}/${pattern}`)
        },
        async (err, files) => {
            if (err) {
                throw err;
            }
            let start = Date.now();
            log(`开始扫描文件...`)
            expressionTraverse.start(path,files);
           
            let end = Date.now();
            let spend = ((end - start) / 1000).toFixed(2);
            log(`执行完毕！时间：${spend}s`)
        });
}

if (module === require.main) {
    let targetPath = process.argv[2];
    if(targetPath){
        run(p.resolve(targetPath));
    }
}

module.exports = {
    run,
};
