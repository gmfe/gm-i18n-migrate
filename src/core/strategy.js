const config = require('../config')

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
    return `src:${sourceStr} => tpl:${template}`
  }
}

function hasVariable (str) {
  return str.includes(config.interpolation.prefix)
}

module.exports = {
  KeyStrategy,
  VariableStrategy,
  CommentStrategy
}
