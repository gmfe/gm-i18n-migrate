let util = require('../util')

function initVisitor (traverser) {
  return {
    CallExpression (path) {
      // 不是I8N
      if (!util.hasTransformedPath(path)) {
        return
      }
      let keyPath = path.get('arguments')[0]
      let node = keyPath.node
      let comments = node.leadingComments
      let tpl = ''
      if (comments && comments.length > 0) {
        let match = comments[0].value.match(/tpl:(.*)/)
        if (match && match[1]) {
          tpl = match[1]
        }
      }
      if (node.value == undefined) {
        util.warn('t函数的key只能为字符串常量(StringLiteral)，请使用单引号或双引号包裹', keyPath)
        traverser.setError()
        return
      }

      traverser.addKey(keyPath, node.value, tpl.trim())
    }
  }
}

module.exports = (traverser) => {
  return {
    visitor: initVisitor(traverser)
  }
}
