const glob = require('glob');
const fs = require('fs-extra');
const p = require('path');
const ExpressionTraverse = require('./core/Traverser')
const util = require('./util');
let config = require('./config')
const {exclude} = config;

function resolvePaths(paths){
    let filePaths = [];
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
    return filePaths;
}

function scan(paths,options) {
    let start = Date.now();
    Object.assign(config,options);
    util.log(`开始扫描文件...`);
    let filePaths = resolvePaths(paths);
    
    util.log(`正在替换和提取多语...文件数：${filePaths.length}`)
    let traverser = new ExpressionTraverse();
    traverser.traverseFiles(filePaths);
    
    let end = Date.now();
    let time = ((end - start) / 1000).toFixed(2);
    util.log(`执行完毕！替换词条数${traverser.keyLen};时长：${time}s`)
}
function sync(paths,options) {
    let start = Date.now();
    Object.assign(config,options);
    let filePaths = resolvePaths(paths);
    util.log(`正在同步...文件数：${filePaths.length}`)
    let traverser = new ExpressionTraverse();
    traverser.syncResource(filePaths);
    
    let end = Date.now();
    let time = ((end - start) / 1000).toFixed(2);
    let {count,removedKeys,newKeys} = traverser.changedKeys;
    util.log(`执行完毕！修改词条数${count};时长：${time}s.\n新增: ${JSON.stringify(newKeys)}\n删除: ${JSON.stringify(removedKeys)}`)
}
module.exports = {
    scan,sync
};
