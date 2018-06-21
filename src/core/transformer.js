
const babel = require('babel-core')
const recast = require('recast')

function transform(filename, transformPlugin) {
    let result = babel.transformFileSync(filename, {
        parserOpts: {
            parser: recast.parse,
            plugins: [
                "asyncGenerators",
                "bigInt",
                "classPrivateMethods",
                "classPrivateProperties",
                "classProperties",
                "decorators",
                "decorators-legacy",
                "doExpressions",
                "dynamicImport",
                "exportDefaultFrom",
                "exportExtensions",
                "exportNamespaceFrom",
                "functionBind",
                "functionSent",
                "importMeta",
                "nullishCoalescingOperator",
                "numericSeparator",
                "objectRestSpread",
                "optionalCatchBinding",
                "optionalChaining",
                "pipelineOperator",
                "throwExpressions",
                'classConstructorCall',
                'jsx',
            ],
        },
        generatorOpts: {
            generator: recast.print,
        },
        plugins: [transformPlugin],
        babelrc: false,
        // sourceMaps: true,
    });
    // const result = babel.transformFileSync(filename, {
    //     presets: ['babel-preset-es2015', 'babel-preset-stage-0',].map(require.resolve),
    //     plugins: [
    //         require.resolve('babel-plugin-syntax-jsx'),
    //         require.resolve('babel-plugin-transform-decorators-legacy'),
    //         transformPlugin,
    //     ]
    // });
    return result.code;
}



module.exports = {
    transform
}
