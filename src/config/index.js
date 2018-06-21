const p = require('path');
const fs = require('fs-extra');

let defaultConfig = {
    rewrite:false, // 覆盖文件
    resourceDir: 'resource',
    outputDir: 'out',
    exclude: [],
    callStatement: 'I18N.get',
    importStatementStr: "import { I18N } from '@common/I18N';\n",
    debug: false,
    // key分隔符
    keySeparator: '#',
    //命名空间分割符
    nsSeparator: '@',

    interpolation: {
        prefix: '${',
        suffix: '}'
    },
}

let strategy = defaultConfig.strategy = {};
strategy.keyStrategy = (() => {
    let counter = 1;
    return ({
        template,
        filePath,
        meta
    }) => {
        return `KEY${counter++}`;
    }
})()

strategy.variableStrategy = (() => {
    let counter = 1;
    return ({
        identifier,
        filePath,
        meta
    }) => {
        return `VAR${counter++}`;;
    }
})()

let userConfig = {};
let configPath = p.join(process.cwd(), 'i18n.config.js');
if (fs.existsSync(configPath)) {
    userConfig = require(configPath);
}


module.exports = Object.assign({}, defaultConfig, userConfig);