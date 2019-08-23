const config = require('../config')
const sha1 = require('sha1')
class Incrementer {
  constructor (initial = 1) {
    this.num = initial
  }
  get count () {
    return `${this.num++}`
  }
}
class KeyStrategy extends Incrementer {
  get ({
    template
  }) {
    if (!hasVariable(template)) {
      return `${template}`
    }
    return `KEY${this.count}`
  }
}

class HashKeyStrategy {
  get ({ template }) {
    if (!hasVariable(template)) {
      return `${template}`
    }
    return sha1(template).slice(0, 6)
  }
}

class VariableStrategy extends Incrementer {
  get () {
    return `VAR${this.count}`
  }
}
class CommentStrategy {
  get ({
    template,
    sourceStr
  }) {
    if (!hasVariable(template)) {
      return ''
    }
    return `tpl:${template}`
  }
}

function hasVariable (str) {
  return str.includes(config.interpolation.prefix)
}

module.exports = {
  KeyStrategy,
  HashKeyStrategy,
  VariableStrategy,
  CommentStrategy
}
