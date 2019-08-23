const p = require('path')
const fs = require('fs-extra')
let config = require('../config')
const {
  outputDir
} = config

class FileHelper {
  constructor () {
    this.basePath = process.cwd().split(/[|/]/).slice(-1)[0].replace(/\\/g, '/')
  }
  formatTabs (filePath) {
    let rawCode = String(fs.readFileSync(filePath))
    rawCode = rawCode.replace(/\t/g, '  ')
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

  write (filePath, content) {
    if (!config.rewrite) {
      filePath = this.getTransformFilePath(filePath)
    }
    fs.outputFileSync(filePath, content)
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
}

module.exports = new FileHelper()
