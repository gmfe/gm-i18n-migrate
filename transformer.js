
const babel = require('babel-core')
const recast = require('recast')

function transform(filename, transformPlugin) {
    let result = babel.transformFileSync(filename, {
        parserOpts: {
            parser: recast.parse,
            plugins: [
            'asyncGenerators',
            'classConstructorCall',
            'classProperties',
            'decorators',
            'doExpressions',
            'exportExtensions',
            'flow',
            'functionSent',
            'functionBind',
            'jsx',
            'objectRestSpread',
            'dynamicImport',
            ],
        },
        generatorOpts: {
            generator: recast.print,
        },
        plugins: [transformPlugin],
        sourceMaps: true,
        });
    return result.code;
}

// const result = transformFileSync(filename, {
//     presets: ['babel-preset-es2015', 'babel-preset-stage-0',].map(require.resolve),
//     plugins: [
//         require.resolve('babel-plugin-syntax-jsx'),
//         require.resolve('babel-plugin-transform-decorators-legacy'),
//         scan,
//     ]
// });

module.exports = {
  transform
}
