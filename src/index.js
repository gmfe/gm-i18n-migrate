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

function run(paths,options) {
    let filePaths = [];
    Object.assign(config,options);
    log(`开始扫描文件...`)
    for(let path of paths){
        path = p.resolve(path);
        let stat = fs.statSync(path);
        if(stat.isDirectory()){
            let files = glob.sync(`${path}/**/*.{js,jsx}`, {
                ignore: exclude.map(pattern => `${path}/${pattern}`)
            });
            filePaths.push(...files);
        }else if(stat.isFile()){
            filePaths.push(path)
        }
    }
    if(filePaths.length == 0){
        throw new Error('请指定扫描路径!');
    }
    let start = Date.now();
    log(`准备替换和提取多语...文件数：${filePaths.length}`)
    expressionTraverse.start(filePaths);
    
    let end = Date.now();
    let spend = ((end - start) / 1000).toFixed(2);
    log(`执行完毕！时长：${spend}s`)
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
