const babel = require('@babel/core')
const recast = require('recast')

let defaultOpts = {
  parserOpts: {
    parser: recast.parse,
    plugins: [
      'asyncGenerators',
      'bigInt',
      'classPrivateMethods',
      'classPrivateProperties',
      'classProperties',
      'decorators-legacy',
      'doExpressions',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'flow',
      'flowComments',
      'functionBind',
      'functionSent',
      'importMeta',
      'jsx',
      'logicalAssignment',
      'nullishCoalescingOperator',
      'numericSeparator',
      'objectRestSpread',
      'optionalCatchBinding',
      'optionalChaining',
      ['pipelineOperator', { proposal: 'minimal' }],
      'throwExpressions'
    ]
  },
  generatorOpts: {
    generator: recast.print
  },
  retainLines: true,
  babelrc: false,
  configFile: false
  // sourceMaps: true,
}

function transformFile (filename, opts) {
  let result = babel.transformFileSync(filename, opts)
  // const result = babel.transformFileSync(filename, {
  //     presets: ['babel-preset-es2015', 'babel-preset-stage-0',].map(require.resolve),
  //     plugins: [
  //         require.resolve('babel-plugin-syntax-jsx'),
  //         require.resolve('babel-plugin-transform-decorators-legacy'),
  //         transformPlugin,
  //     ]
  // });
  return result.code
}

module.exports = (plugins) => {
  let opts = Object.assign({}, defaultOpts, {
    plugins
  })
  return {
    transformFile: (filename) => transformFile(filename, opts)
  }
}
