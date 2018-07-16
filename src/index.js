const glob = require('glob');
const fs = require('fs-extra');
const p = require('path');
const Traverser = require('./core/Traverser')
const util = require('./util');
let config = require('./config')
const { exclude } = config;

function resolvePaths(paths) {
    let filePaths = [];
    for (let path of paths) {
        path = p.resolve(path);
        let stat = fs.statSync(path);
        if (stat.isDirectory()) {
            let files = glob.sync(`${path}/**/*.{js,jsx}`, {
                ignore: exclude.map(pattern => `${path}/${pattern}`)
            });
            filePaths.push(...files);
        } else if (stat.isFile()) {
            filePaths.push(path)
        }
    }
    if (filePaths.length == 0) {
        throw new Error('请指定扫描路径!');
    }
    return filePaths;
}

function scan(paths, options) {
    let start = Date.now();
    Object.assign(config, options);
    util.log(`开始扫描文件...`);
    let filePaths = resolvePaths(paths);

    util.log(`正在替换和提取多语...文件数：${filePaths.length}`)
    let traverser = new Traverser();
    traverser.traverseFiles(filePaths);

    let end = Date.now();
    let time = ((end - start) / 1000).toFixed(2);
    util.log(`执行完毕！替换词条数${traverser.keyLen};时长：${time}s`)
}
function sync(paths, options) {
    let start = Date.now();
    // Object.assign(config, options);
    let filePaths = resolvePaths(paths);
    util.log(`正在同步...文件数：${filePaths.length}`)
    let traverser = new Traverser();
    traverser.syncResource(filePaths,options);

    let end = Date.now();
    let time = ((end - start) / 1000).toFixed(2);
    let { count, removedKeys, newKeys } = traverser.changedKeys;
    util.log(`执行完毕！修改词条数${count};时长：${time}s.\n新增: ${JSON.stringify(newKeys)}\n删除: ${JSON.stringify(removedKeys)}`)
}
// 将多语文件合并到第一个文件
function assign(paths, options) {
    let result = {};
    for (let path of paths) {
        let json = fs.readJSONSync(path);
        Object.assign(result, json);
    }
    let outPath = options.out || paths[0]
    fs.writeJSONSync(outPath, result);
    util.log(`合并完毕，输出文件路径 ${outPath}`);
}
// 将多语文件合并到第一个文件，不会新增key
function merge(paths, options) {
    let result = fs.readJSONSync(path);
    paths.splice(0,1);
    for (let path of paths) {
        let json = fs.readJSONSync(path);
        Object.keys(json).forEach((key)=>{
            if(result[key]){
                result[key] = json[key];
            }
        })
    }
    let outPath = options.out || paths[0]
    fs.writeJSONSync(outPath, result);
    util.log(`合并完毕，输出文件路径 ${outPath}`);
}
function pick(paths,options){
    let result = {};
    for (let path of paths) {
        let json = fs.readJSONSync(path);
        Object.entries(json)
        .forEach(([key,val]) => {
            if(!util.isChinese(val)) {
                result[key] = val;
            }
        });
    }
    let outPath = options.out || paths[0]
    fs.writeJSONSync(outPath, result);
    util.log(`pick完毕，输出文件路径 ${outPath}`);
}

// 比较两个资源文件，将差异输出到文件
function diff(paths, options) {
    function compare(keys,map,json){
        let result = {};
        for (let key of keys) {
            if(!map[key]){
             result[key] = json[key];
            }
         }
         return result;
    }
    let json1 = fs.readJSONSync(paths[0]);
    let json2 = fs.readJSONSync(paths[1]);
    let keys1 = Object.keys(json1);
    let keys2 = Object.keys(json2);

    let map1 = util.makeMap(keys1);
    let map2 = util.makeMap(keys2);

    let result = Object.assign(compare(keys1,map2,json1),compare(keys2,map1,json2))

    let outPath = options.out || p.join(process.cwd(), 'diff.json');
    fs.writeJSONSync(outPath, result);
    util.log(`比较完毕，输出文件路径 ${outPath}`);
}
const excel = require('./excel')
module.exports = {
    assign, scan, sync, merge, diff,pick, ...excel
};
