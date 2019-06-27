let util = require('../util')
const fileHelper = require('./fileHelper')
const fs = require('fs-extra')
const t = require('babel-types')
const initTransformer = require('../plugin/transformer')
const scanPlugin = require('../plugin/scanPlugin')
const syncPlugin = require('../plugin/syncPlugin')
const {
  KeyStrategy,
  CommentStrategy
} = require('./strategy')
const Expression = require('./Expression')
const EXCLUDE_TYPE = {
  ImportDeclaration: true, // import语句中的字符串
  MemberExpression: true // 类似user['name']
}

function shouldExclude (path) {
  let type = path.parent.type
  switch (type) {
    case 'NewExpression':
      if (path.parent.callee.name === 'RegExp') { // 正则跳过
        return true
      }
      break
  }
  return !!EXCLUDE_TYPE[type]
}
const ROOT_PARENT_TYPES = {
  ObjectProperty: true, // 对象属性
  ConditionalExpression: true, // 条件
  VariableDeclarator: true, // 变量初始化
  AssignmentExpression: true, // 赋值语句
  ReturnStatement: true, // 返回语句
  JSXExpressionContainer: true, // jsx表达式
  JSXAttribute: true, // jsx属性
  ArrayExpression: true, // 数组
  CallExpression: true, // 函数调用
  AssignmentPattern: true, // 函数默认值
  LogicalExpression: true, // 逻辑表达式
  ClassProperty: true, // 类属性
  SwitchStatement: true, // switch语句
  SwitchCase: true, // switch case
  NewExpression: true, // new Error('ff')
  ArrowFunctionExpression: true // value => Big(value || 0).div(100).toFixed(2) + '元'
}
const rootOperator = ['==', '!=', '===', '!==', 'in']

function isRootParentPath (path) {
  let {
    node
  } = path
  switch (node.type) {
    case 'BinaryExpression':
      if (rootOperator.includes(node.operator)) {
        return true
      };
      break
  }

  return !!ROOT_PARENT_TYPES[node.type]
}

class Traverser {
  constructor (options = {}) {
    this.sourcemapData = {}
    this.extraKeys = {}
    this.modifiedSet = new Set()
    this.options = options
    this.setup()
  }
  setup () {
    let initial = 1
    let sourcemap = fileHelper.getSourceMapContent()
    if (sourcemap) {
      initial = sourcemap.meta.nextKeyNum
    }
    let keyStrategy = new KeyStrategy(initial)
    if (this.options.basejson) {
      // 修复插值情况KEY值不一致问题
      // 从旧的多语文件中提取出该模板对应的KEY
      let baseJSON = fs.readJSONSync(this.options.basejson)
      let keys = Object.keys(baseJSON)
        .filter((key) => key.startsWith('KEY'))
      let values = keys.map((key) => baseJSON[key])

      class BaseJsonKeyStrategy extends KeyStrategy {
        get ({ template }) {
          let i = values.indexOf(template)
          if (i === -1) {
            return super.get({ template })
          }
          util.log(`模板「${template}」复用KEY「${keys[i]}」`)
          return keys[i]
        }
      }
      keyStrategy = new BaseJsonKeyStrategy(initial)
    }
    this.ctx = {
      keyStrategy,
      commentStrategy: new CommentStrategy()
    }
  }

  syncJSON (oldJSON, scanedJSON, options) {
    let result = {}
    Object.keys(scanedJSON).forEach((key) => {
      if (oldJSON[key] && !this.modifiedSet.has(key)) {
        // 词条没有更新 复用旧的翻译
        result[key] = oldJSON[key]
      } else {
        result[key] = scanedJSON[key]
      }
    })
    return result
  }
  removeDuplicate (json) {
    let result = {}
    Object.keys(json).forEach((key) => {
      let val = json[key]
      if (key !== val) {
        result[key] = val
      }
    })
    return result
  }
  calcScanedJSON (scanedJSON, cnJSON) {
    // 先处理下 scanedJSON
    Object.keys(scanedJSON).forEach((key) => {
      let val = scanedJSON[key]
      let cnVal = cnJSON[key]
      if (!val) {
        // 同一个key 如果没设置tpl 有旧的用旧的 没有设为默认
        let tpl = cnVal
        if (!tpl) {
          tpl = key
          const sep = this.options.nsSeparator
          if (key.includes(sep)) {
          // __视为ns分割符 取最后一个
            tpl = key.split(sep).slice(-1)[0]
          }
        }
        scanedJSON[key] = tpl
      }
    })
    Object.keys(cnJSON).forEach((key) => {
      let val = cnJSON[key]
      let scanedValue = scanedJSON[key]
      // 扫描出来的dynamic不等于旧的 说明更新了 对应的翻译也要重置
      if (scanedValue && scanedValue !== val) {
        this.modifiedSet.add(key)
      }
    })
  }
  syncJSONWithPath (options) {
    if (!Array.isArray(options.jsonpath)) {
      options.jsonpath = [options.jsonpath]
    }
    let paths = options.jsonpath
    // scanedJSON 没有注释则 tpl为''
    let scanedJSON = this.getLanguageFromSourcemap(this.extraKeys)

    let cnPath = paths.shift() // 第一个是中文多语
    let hkPath = paths.shift() // 第二个是hk繁体
    let cnJSON = fileHelper.getJSON(cnPath)

    // 通过脚本扫描，各个多语文件之间的状态是一致的。一改具改 不应该手动的改动多语文件(静态的词条可以)
    // 根据 cnJSON 补充 scanedJSON
    this.calcScanedJSON(scanedJSON, cnJSON)

    util.log(`扫描到词条数: ${Object.keys(scanedJSON).length}`)
    // 从扫到的json中去掉冗余的，输出到中文
    let simpleScanedJSON = this.removeDuplicate(scanedJSON)
    fs.outputJSONSync(cnPath, simpleScanedJSON)

    util.log('')
    for (let path of paths) {
      // 将差异同步到多语文件
      util.log(`开始同步到多语文件 ${path}`)

      let oldJSON = fileHelper.getJSON(path)
      let result = this.syncJSON(oldJSON, scanedJSON, options)
      fs.outputJSONSync(path, result)
    }
    // bshop 生成繁体
    if (fs.existsSync('./js/register') && fs.existsSync('./js/cmskey')) {
      const s2hk = require('./s2hk')
      util.log(`生成繁体${hkPath}`)
      let hkJSON = {}
      Object.keys(scanedJSON).forEach((key) => {
        let val = scanedJSON[key]
        hkJSON[key] = s2hk(val)
      })
      fs.outputJSONSync(hkPath, hkJSON)
    }

    util.log('done')
  }
  syncResource (files, options) {
    const {
      transformFile
    } = initTransformer([syncPlugin(this)])

    files.forEach((filePath) => {
      transformFile(filePath)
    })
    if (options.jsonpath) {
      this.syncJSONWithPath(options)
    } else {
      // 默认同步 ./locales/zh/default.json ./locales/en/default.json
      options.jsonpath = fileHelper.getLanguageJSONPaths()
      this.syncJSONWithPath(options)
    }
  }
  addKey (path, key, tpl) {
    let val = util.getKeyInfo(path, tpl)
    let oldVal = this.extraKeys[key]
    if (oldVal && oldVal.template !== val.template) {
      throw new Error(`KEY「${key}」对应的模板有多个\n${oldVal.template}\n${val.template}\n请检查！`)
    }
    this.extraKeys[key] = val
  }
  traverseFiles (files) {
    const {
      transformFile
    } = initTransformer([scanPlugin(this)])

    files.forEach((filePath) => {
      // 替换\t
      fileHelper.formatTabs(filePath)
      const code = transformFile(filePath)
      // 替换为 i18n.t
      fileHelper.write(filePath, code)
    })
    this.writeResourceByMerge()
  }
  buildExpression (rootPath) {
    let exp = new Expression(rootPath, this.ctx)
    let result = exp.evaluateAndReplace()
    if (result == null) {
      // 计算不了或跳过的情况
      return false
    }

    Object.assign(this.sourcemapData, result)
    return true
  }
  findRoot (path) {
    // 子能找到父 父找不到子(可能一对多)
    let rootPath = null
    let curPath = path
    while ((path = path.parentPath)) {
      if (isRootParentPath(path)) {
        rootPath = curPath
        break
      }
      curPath = path
    }

    return rootPath
  }
  traverseNodePath (path) {
    util.debug(`接收到Path`, path)
    // path 只可能为 String Template
    // 已经是I8N的String 用于第二次扫描时判断逻辑
    if (util.parentPathHasTransformed(path)) {
      return
    }
    // 特殊的语句
    if (shouldExclude(path)) {
      return
    }
    // root 代表 expression的起点
    let rootPath
    if (t.isStringLiteral(path) &&
            this.options.shouldSingleReplace(path.node.value)) {
      rootPath = path
    } else {
      rootPath = this.findRoot(path)
    }

    if (rootPath == null) {
      util.warn('找不到root的场景', path)
      return
    }
    this.traverseRootPath(rootPath)
  }
  traverseJSXText (textPath) {
    if (!this.options.fixjsx) {
      // 默认独立解析
      return this.traverseRootPath(textPath)
    }

    let jsxElement = textPath.find((p) => t.isJSXElement(p))
    let childrenPaths = jsxElement.get('children')
    let hasChildElement = childrenPaths.some((child) => t.isJSXElement(child))
    if (!hasChildElement) {
      // 中文 + variable 的情况
      let hasChinese = childrenPaths.some((child) => t.isJSXText(child) && util.hasChinese(child.node.value))
      let hasVariable = childrenPaths.some((child) => t.isJSXExpressionContainer(child))

      if (hasChinese && hasVariable) {
        // 多个path
        let isSuccess = this.buildExpression(childrenPaths)
        if (!isSuccess) {
          // 回退
          util.log('尝试整体解析JSXText失败，开始单独解析\n')
          return this.traverseRootPath(textPath)
        }
        return
      }
    }
    // 单独处理JSXText
    return this.traverseRootPath(textPath)
  }
  traverseRootPath (rootPath) {
    util.debug(`开始遍历rootPath：`, rootPath)
    // 仅由StringLiteral/JSXText 且不是中文 构成的expression
    if ((t.isStringLiteral(rootPath) || t.isJSXText(rootPath)) &&
            !util.hasChinese(rootPath.node.value)) {
      return
    }
    if (util.parentPathHasTransformed(rootPath)) {
      // rootPath在第一个String出现时 就会替换成i18n
      // 但是之前的rootpath下的子节点还是会遍历
      util.debug(`重复遍历的rootPath：`, rootPath)
      return
    }
    //
    if (util.shouldExcludeRoot(rootPath)) {
      return
    }

    this.buildExpression(rootPath)
  }
  getLanguageFromSourcemap (sourcemap) {
    return Object.entries(sourcemap)
      .reduce((accm, [key, o]) => {
        accm[key] = o.template
        return accm
      }, {})
  }
  writeLang (sourcemap) {
    let langResource = this.getLanguageFromSourcemap(sourcemap)
    // 多语资源文件
    fileHelper.writeLang(langResource)
  }
  writeResourceByMerge () {
    let oldSourcemap = fileHelper.getSourceMapContent()
    let toWriteSouceMap = this.sourcemapData
    if (oldSourcemap) {
      toWriteSouceMap = Object.assign(oldSourcemap.data, this.sourcemapData)
    }

    this.writeLang(toWriteSouceMap)
    let nextKeyNum = this.ctx.keyStrategy.count
    toWriteSouceMap = {
      data: toWriteSouceMap,
      meta: {
        nextKeyNum
      }
    }
    // 映射文件
    fileHelper.writeSourceMap(toWriteSouceMap)
  }
  get keyLen () {
    return Object.keys(this.sourcemapData).length
  }
}
module.exports = Traverser
