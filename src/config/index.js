const p = require('path');
const fs = require('fs-extra');

let defaultConfig = {
    rewrite:false, // 覆盖文件
    resourceDir: 'resource',
    outputDir: 'out',
    exclude: [],
    callStatement: 'i18next.t',
    importStatementStr: "import {i18next} from 'gm-i18n'\n",
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
let userConfig = {};
let configPath = p.join(process.cwd(), 'i18n.config.js');
if (fs.existsSync(configPath)) {
    userConfig = require(configPath);
}

let config = Object.assign({}, defaultConfig, userConfig);
module.exports = config