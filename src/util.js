const config = require('./config')
const fileHelper = require('./core/fileHelper')
const recast = require('recast')
const codeFrameColumns = require('babel-code-frame')
const t = require('babel-types')
exports.hasChinese = (text) => {
  return /[\u4e00-\u9fa5]/.test(text)
}

exports.parentPathHasTransformed = (path) => {
  return exports.hasTransformedPath(path.parentPath)
}
exports.hasTransformedPath = (path) => {
  if (t.isCallExpression(path.node)) {
    if (t.isMemberExpression(path.node.callee)) {
      let name = path.node.callee.object.name
      let fn = path.node.callee.property.name
      if (`${name}.${fn}` === config.callStatement) {
        return true
      }
    } else if (t.isIdentifier(path.node.callee)) {
      return path.node.callee.name === config.callStatement
    }
  }
  return false
}

exports.isMomentFormat = (parentNode) => {
  return t.isCallExpression(parentNode) &&
        t.isMemberExpression(parentNode.callee) &&
        t.isIdentifier(parentNode.callee.property) &&
        parentNode.callee.property.name === 'format'
}

exports.isSpecialFunc = (parentNode, name) => {
  return t.isCallExpression(parentNode) &&
        t.isMemberExpression(parentNode.callee) &&
        t.isIdentifier(parentNode.callee.object) &&
        parentNode.callee.object.name === name
}
exports.shouldExcludeRoot = (rootPath) => {
  let names = ['console', 'moment']
  let parentNode = rootPath.parent
  if (exports.isMomentFormat(parentNode)) {
    return true
  }
  return names.some((name) => {
    return exports.isSpecialFunc(parentNode, name)
  })
}

exports.parseStr = (str) => {
  return recast.parse(str).program.body[0]
}
exports.getKeyInfo = (path, template) => {
  return {
    ...exports.getMetaFromPath(path),
    template

  }
}
exports.getMetaFromPath = (path) => {
  path = exports.safePath(path)
  let info = {
    filename: fileHelper.formatFilePath(path.hub.file.log.filename),
    source: exports.getSource(path),
    location: exports.getLocation(path)
  }

  return info
}
exports.getLocation = (path) => {
  path = exports.safePath(path)
  let loc = path.node.loc
  if (loc) {
    let {
      start,
      end
    } = loc
    return `${start.line}:${start.column}-${end.line}:${end.column}`
  }
  return ''
}
exports.getErrorMsg = (msg, path) => {
  path = exports.safePath(path)
  const {
    node
  } = path
  const rawCode = path.hub.file.code
  let extraInfo = `${JSON.stringify(exports.getMetaFromPath(path))}`
  if (node.loc) {
    let {
      line,
      column
    } = node.loc.start
    extraInfo = `${path.hub.file.log.filename}:${line}:${column}
      ${codeFrameColumns(rawCode, line, column, { highlightCode: true })}`
  }
  const errMessage = `${msg}\n${extraInfo}`
  return errMessage
}
exports.makeComment = (comment) => {
  comment = `${comment.replace(/\/\*/, 'Comment: ').replace(/\*\//, ' :Comment')}`
  return comment ? `/* ${comment} */` : ''
}
exports.getSource = (p, trim = true) => {
  let code = exports.safePath(p).getSource()
  return trim ? code.trim() : code
  // return exports.getSourceFromLoc(exports.safePath(p))
}

exports.safePath = (path) => {
  if (Array.isArray(path)) {
    return path[0].parentPath
  }
  return path
}
exports.error = (msg, path) => {
  if (config.debug) {
    throw new Error(exports.getErrorMsg(msg, path))
  }
  exports.warn(msg, path)
}
exports.throwError = (msg, path) => {
  throw new Error(exports.getErrorMsg(msg, path))
}
exports.log = (msg) => {
  return console.log(msg)
}
exports.debug = (msg, path) => {
  if (config.debug) {
    return console.log(`debug:${msg}\n${JSON.stringify(exports.getMetaFromPath(path))}`)
  }
}
exports.warn = (msg, path) => {
  return console.warn(exports.getErrorMsg(msg, path))
}
exports.assert = (condition, msg, path) => {
  if (!condition) {
    exports.throwError(msg, path)
  }
}
exports.makeMap = (array) => {
  return array.reduce((accm, key) => {
    accm[key] = true
    return accm
  }, {})
}
