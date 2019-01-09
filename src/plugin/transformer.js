const babel = require('babel-core')
const recast = require('recast')

let defaultOpts = {
  parserOpts: {
    parser: recast.parse,
    plugins: [
      'asyncGenerators',
      'classPrivateMethods',
      'classPrivateProperties',
      'classProperties',
      'decorators',
      'decorators-legacy',
      'doExpressions',
      'dynamicImport',
      'exportDefaultFrom',
      'exportExtensions',
      'exportNamespaceFrom',
      'functionBind',
      'functionSent',
      'importMeta',
      'nullishCoalescingOperator',
      'numericSeparator',
      'objectRestSpread',
      'optionalCatchBinding',
      'optionalChaining',
      'pipelineOperator',
      'throwExpressions',
      'classConstructorCall',
      'jsx'
    ]
  },
  generatorOpts: {
    generator: recast.print
  },
  babelrc: false
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
