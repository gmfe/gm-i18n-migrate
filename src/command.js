const glob = require('glob')
const fs = require('fs-extra')
const p = require('path')
const Traverser = require('./core/Traverser')
const util = require('./util')
let config = require('./config')
const { exclude } = config
const excelUtil = require('./excel')
const fileHelper = require('./core/fileHelper')

let base = fs.outputJSONSync.bind(fs)
fs.outputJSONSync = function (file, obj, options) {
  options = {
    encoding: 'utf-8',
    spaces: 2,
    ...options
  }
  base(file, obj, options)
}

function resolvePaths (paths) {
  let filePaths = []
  for (let path of paths) {
    path = p.resolve(path)
    let stat = fs.statSync(path)
    if (stat.isDirectory()) {
      let files = glob.sync(`${path}/**/*.{js,jsx}`, {
        ignore: exclude.map(pattern => p.join(path, pattern))
      })
      filePaths.push(...files)
    } else if (stat.isFile()) {
      filePaths.push(path)
    }
  }
  if (filePaths.length === 0) {
    throw new Error('请指定扫描路径!')
  }
  return filePaths
}

exports.scan = (paths, options) => {
  let start = Date.now()
  options = Object.assign(config, options)
  util.log(`开始扫描文件...`)
  let filePaths = resolvePaths(paths)

  util.log(`正在替换和提取多语...文件数：${filePaths.length}`)
  let traverser = new Traverser(options)
  traverser.traverseFiles(filePaths)

  let end = Date.now()
  let time = ((end - start) / 1000).toFixed(2)
  util.log(`执行完毕！替换词条数${traverser.keyLen};时长：${time}s`)
}
exports.check = (paths) => {
  let traverser = new Traverser()
  traverser.check(paths)
}
exports.sync = (paths, options) => {
  options = Object.assign(config, options)
  if (!paths || paths.length === 0) {
    paths = fileHelper.getSyncPaths()
  }
  let filePaths = resolvePaths(paths)
  util.log(`开始扫描...文件数：${filePaths.length}\n`)
  let traverser = new Traverser(options)
  traverser.sync(filePaths, options)
}

// 在业务项目根目录调用
// 1. 生成 base.json 2. copy zh.json 到 options.out
exports.pick = (options) => {
  const paths = fileHelper.getSyncPaths()
  let filePaths = resolvePaths(paths)
  let traverser = new Traverser()
  traverser.pick(filePaths, options)
}
// 在 gm_static_langauge 根目录调用
exports.update = (options) => {
  let traverser = new Traverser()
  const jsonDir = p.resolve('.')
  traverser.update(jsonDir)
}

// 将多语文件合并到第一个文件
exports.assign = (paths, options) => {
  let result = {}
  for (let path of paths) {
    let json = fs.readJSONSync(path)
    Object.assign(result, json)
  }
  let outPath = options.out || paths[0]
  fs.outputJSONSync(outPath, result)
  util.log(`合并完毕，输出文件路径 ${outPath}`)
}
const mergeJSON = (jsons) => {
  let result = jsons.shift()
  for (let json of jsons) {
    Object.keys(json).forEach((key) => {
      if (result.hasOwnProperty(key) && json[key]) {
        result[key] = json[key]
      }
    })
  }
  return result
}
// 将多语文件合并到第一个文件，不会新增key
exports.merge = (paths, options) => {
  let jsons = paths.map((path) => fs.readJSONSync(path))
  let result = mergeJSON(jsons)
  let outPath = options.out || paths[0]
  fs.outputJSONSync(outPath, result)
  util.log(`合并完毕，输出文件路径 ${outPath}`)
}
// 提取多语文件中的英文or中文
const pickJSON = (jsonPath, options = {}) => {
  let result = {}
  const jsonDir = p.dirname(jsonPath)
  const baseJSON = fs.readJSONSync(p.join(jsonDir, 'base.json'))
  // 还没经过sync生成
  if (!fs.existsSync(jsonPath)) {
    result = baseJSON
  } else {
    let json = fs.readJSONSync(jsonPath)
    Object.entries(json)
      .forEach(([key, val]) => {
        switch (options.type) {
          case 'cn':
            // 提取中文
            if (util.hasChinese(val)) {
              result[key] = val
            }

            break
          case 'en':
            // 提取没有中文的词条
            if (!util.hasChinese(val)) {
              result[key] = val
            }
            break
          default:
            // 提取全部
            result[key] = val
            break
        }
      })
  }

  return result
}
// 比较两个资源文件，将差异输出到文件
exports.diff = (paths, options) => {
  function compare (keys, map, json) {
    let result = {}
    for (let key of keys) {
      if (!map[key]) {
        result[key] = json[key]
      }
    }
    return result
  }
  let json1 = fs.readJSONSync(paths[0])
  let json2 = fs.readJSONSync(paths[1])
  let keys1 = Object.keys(json1)
  let keys2 = Object.keys(json2)

  let map1 = util.makeMap(keys1)
  let map2 = util.makeMap(keys2)

  let result
  if (options.left) {
    result = compare(keys1, map2, json1)
  } else if (options.right) {
    result = compare(keys2, map1, json2)
  } else {
    result = Object.assign(compare(keys1, map2, json1), compare(keys2, map1, json2))
  }

  let outPath = options.out || p.join(process.cwd(), 'diff.json')
  fs.outputJSONSync(outPath, result)
  util.log(`比较完毕，输出文件路径 ${outPath}`)
}

// 导出excel
exports.pickToXlsx = (jsonPath, options) => {
  let json = pickJSON(jsonPath, options)
  const jsonDir = p.dirname(jsonPath)
  options.jsonDir = jsonDir
  excelUtil.jsonContent2Xlsx(json, options)
}

// 多个xlsx合并为一个
exports.assignToXlsx = (xlsxPaths, options) => {
  excelUtil.assignXlsx(xlsxPaths, { excelPath: '合并输出.xlsx' })
}

// merge
exports.mergeFromXlsx = (xlsxPath, jsonPath) => {
  let json = excelUtil.xlsx2JsonContent(xlsxPath)
  let targetJSON = fs.readJSONSync(jsonPath)
  let resultJSON = mergeJSON([targetJSON, json])
  fs.outputJSONSync(jsonPath, resultJSON)
  util.log(`合并完毕，输出文件路径 ${jsonPath}`)
}
exports = {
  ...exports,
  ...excelUtil
}
