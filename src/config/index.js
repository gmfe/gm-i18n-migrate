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
strategy.keyStrategyFactory = (() => {
    let counter = 1;
    return ({
        template,
        path,
    }) => {
        let util = require('../core/util')
        // 没有变量
        if(!template.includes(config.interpolation.prefix)){
            return `${template}`;
        }
        return `KEY${util.getLocation(path)}`
        // return `KEY${counter++}`;
    }
})
strategy.keyStrategy = (() => {
    let counter = 1;
    return ({
        template,
        path,
    }) => {
        let util = require('../core/util')
        // 没有变量
        if(!template.includes(config.interpolation.prefix)){
            return `${template}`;
        }
        return `KEY${counter++}`;
    }
})()
strategy.commentStrategy = (() => {
    let counter = 1;
    return ({
        template,
        sourceStr
    }) => {
        // 没变量不用注释
        if(!template.includes(config.interpolation.prefix)){
            return '';
        }
        return `src:${sourceStr} => tpl:${template}`;
    }
})()

strategy.variableStrategy = (() => {
    let counter = 1;
    return ({
        path,
    }) => {
        return `VAR${counter++}`;;
    }
})()

let userConfig = {};
let configPath = p.join(process.cwd(), 'i18n.config.js');
if (fs.existsSync(configPath)) {
    userConfig = require(configPath);
}

let config = Object.assign({}, defaultConfig, userConfig);
module.exports = config