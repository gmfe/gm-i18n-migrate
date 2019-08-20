const p = require('path')
const fs = require('fs-extra')
let config = require('../config')
const {
  resourceDir,
  outputDir
} = config
const souceMapFileName = 'soucemap.json'
const langFileName = 'zh-cn.json'

class FileHelper {
  constructor () {
    this.basePath = process.cwd().split(/[|/]/).slice(-1)[0].replace(/\\/g, '/')
  }
  formatTabs (filePath) {
    let rawCode = String(fs.readFileSync(filePath))
    rawCode = rawCode.replace(/\t/g, '    ')
    fs.outputFileSync(filePath, rawCode)
  }
  formatFilePath (filePath) {
    if (!filePath) {
      return ''
    }
    return filePath.split(this.basePath)[1]
  }
  getTransformFilePath (filePath) {
    filePath = filePath.split(this.basePath)[1]
    return p.join(outputDir, filePath)
  }
  getSourceMapContent () {
    let path = this.getResourceFilePath(souceMapFileName)
    if (fs.existsSync(path)) {
      return fs.readJSONSync(path)
    }
    return ''
  }
  getResourceFilePath (filaname) {
    return p.join(resourceDir, filaname)
  }
  isApp () {
    if (fs.existsSync('./js')) {
      return true
    }
    return false
  }
  isLib () {
    return !this.isApp()
  }
  getSyncPaths () {
    if (fs.existsSync('./js')) {
      return ['./js']
    }
    return ['./src']
  }
  getJSON (path) {
    let json = {}
    if (fs.existsSync(path)) {
      json = fs.readJSONSync(path)
    }
    return json
  }

  getAppCnJSON () {
    let cnPath = this.getAppCnJSONPath()
    if (!fs.existsSync(cnPath)) {
      return {}
    }
    return fs.readJSONSync(cnPath)
  }
  getAppCnJSONPath () {
    // 兼容旧的路径
    const jsonDir = this.getAppOrLibJSONDir()
    const legacyPath = './locales/zh/default.json'
    const newPath = `${jsonDir}/zh.json`
    if (fs.existsSync(newPath) || !fs.existsSync(legacyPath)) {
      return newPath
    }
    return legacyPath
  }
  getAppOrLibJSONDir () {
    return './locales'
  }

  writeSourceMap (content) {
    this.writeResource(souceMapFileName, content)
  }
  writeLang (content) {
    this.writeResource(langFileName, content)
  }
  writeResource (filename, json) {
    let resourcePath = this.getResourceFilePath(filename)
    fs.outputJSONSync(resourcePath, json)
  }
  write (filePath, content) {
    if (!config.rewrite) {
      filePath = this.getTransformFilePath(filePath)
    }
    fs.outputFileSync(filePath, content)
  }
}

module.exports = new FileHelper()
