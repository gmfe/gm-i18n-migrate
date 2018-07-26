let util = require('../util')
let config = require('../config')
const fileHelper = require('./fileHelper');
const fs = require('fs-extra');
const t = require('babel-types')
const initTransformer = require('../plugin/transformer')
const transformPlugin = require('../plugin/transformPlugin')
const syncPlugin = require('../plugin/syncPlugin')
const {
    KeyStrategy,
    CommentStrategy
} = require('./strategy')
const Expression = require('./Expression')
const EXCLUDE_TYPE = {
    ImportDeclaration: true, // import语句中的字符串
    MemberExpression: true, // 类似user['name']
}

function shouldExclude(path) {
    let type = path.parent.type
    switch (type) {
        case 'NewExpression':
            if (path.parent.callee.name === 'RegExp') { // 正则跳过
                return true;
            }
            break;
    }
    return !!EXCLUDE_TYPE[type];
}
const ROOT_PARENT_TYPES = {
    ObjectProperty: true, // 对象属性
    ConditionalExpression: true, // 条件
    VariableDeclarator: true, // 变量初始化
    AssignmentExpression: true, // 赋值语句
    ReturnStatement: true, // 返回语句
    JSXExpressionContainer: true, // jsx表达式
    JSXAttribute: true, // jsx属性 
    ArrayExpression: true, // 数组
    CallExpression: true, // 函数调用
    AssignmentPattern: true, // 函数默认值
    LogicalExpression: true, // 逻辑表达式
    ClassProperty: true, // 类属性
    SwitchStatement: true, // switch语句
    SwitchCase: true, // switch case  
    NewExpression: true, // new Error('ff') 
    ArrowFunctionExpression: true, // value => Big(value || 0).div(100).toFixed(2) + '元'
}
const rootOperator = ['==', '!=', '===', '!==', 'in'];

function isRootParentPath(path) {
    let {
        node
    } = path;
    switch (node.type) {
        case 'BinaryExpression':
            if (rootOperator.includes(node.operator)) {
                return true;
            };
            break;
    }

    return !!ROOT_PARENT_TYPES[node.type];
}

class Traverser {
    constructor() {
        this.sourcemapData = {};
        this.extraKeys = {};
        this.changedCount = 0;
        this.newKeys = [];
        this.modifiedKeys = [];
        this.removedKeys = [];
        this.setup();
    }
    setup() {
        let initial = 1;
        let sourcemap = fileHelper.getSourceMapContent();
        if (sourcemap) {
            initial = sourcemap.meta.nextKeyNum;
        }
        this.ctx = {
            keyStrategy: new KeyStrategy(initial),
            commentStrategy: new CommentStrategy(),
        }
    }

    calcDiff(oldJSON, scanedJSON, options) {
        // 不能直接覆盖 因为 插值情况newJSON拿不到模板
        if (options.clean) {
            Object.keys(oldJSON).forEach((key) => {
                if (!scanedJSON.hasOwnProperty(key)) {
                    util.log(`「删除」 ${key}`)
                    this.removedKeys.push(key)
                }
            })
        }
       
        Object.keys(scanedJSON).forEach((key) => {
            if (!oldJSON.hasOwnProperty(key)) {
                 // 添加新的
                if (!scanedJSON[key]) {
                    scanedJSON[key] = key; // 默认设置为key
                }
                // 新增的key
                util.log(`「新增」 ${key}:${scanedJSON[key]}`)
                this.newKeys.push([key, scanedJSON[key]])
            } else if (oldJSON[key] !== scanedJSON[key] // 修改已有的
                && scanedJSON[key]) { // 如果有注释设置了tpl
                util.log(`「修改」 ${key}:${scanedJSON[key]}`)
                this.modifiedKeys.push([key, scanedJSON[key]]);
            }
        })
    }

    syncJSON(oldJSON, options) {
        if (options.clean) {
            for (let removedKey of this.removedKeys) {
                delete oldJSON[removedKey];
            }
        }
        for (let [key, val] of this.newKeys.concat(this.modifiedKeys)) {
            oldJSON[key] = val;
        }
    }
    syncJSONWithPath(options) {
        if (!Array.isArray(options.jsonpath)) {
            options.jsonpath = [options.jsonpath];
        }
        let paths = options.jsonpath;
        // scanedJSON 没有注释则 tpl为''
        let scanedJSON = this.getLanguageFromSourcemap(this.extraKeys);

        let cnPath = paths[0];
        let cnJSON = fs.readJSONSync(cnPath);
        // 计算出与中文多语的差异
        this.calcDiff(cnJSON, scanedJSON, options);
        util.log('');
        for (let path of paths) {
            // 将差异同步到多语文件
            util.log(`开始同步到多语文件 ${path}`)
            let oldJSON = fs.readJSONSync(path);
            this.syncJSON(oldJSON, options);
            fs.outputJSONSync(path, oldJSON);
        }
        util.log('');
    }
    syncResource(files, options) {
        const {
            transformFile
        } = initTransformer([syncPlugin(this)]);

        files.forEach((filePath) => {
            transformFile(filePath)
        });
        if (options.jsonpath) {
            this.syncJSONWithPath(options)
        } else {
            // 默认同步 ./locales/zh/default.json ./locales/en/default.json 
            options.jsonpath = ['./locales/zh/default.json', './locales/en/default.json']
            this.syncJSONWithPath(options)

            // 第一次迁移时同步sourcemap与语言包
            // let sourcemap = fileHelper.getSourceMapContent();
            // if (!sourcemap) {
            //     return;
            // }

            // let sourceData = sourcemap.data;
            // this.syncJSON(sourceData,this.extraKeys,options)
            // if (this.changedCount > 0) {
            //     this.writeLang(sourceData);
            //     fileHelper.writeSourceMap(sourcemap);
            // }
        }

    }
    addKey(path, key, tpl) {
        this.extraKeys[key] = util.getKeyInfo(path, tpl);
    }
    traverseFiles(files) {
        const {
            transformFile
        } = initTransformer([transformPlugin(this)]);

        files.forEach((filePath) => {
            // 替换\t
            fileHelper.formatTabs(filePath)
            const code = transformFile(filePath)
            // 替换为 i18n.t 
            fileHelper.write(filePath, code);
        });
        this.writeResourceByMerge();
    }
    buildExpression(rootPath) {
        let exp = new Expression(rootPath, this.ctx)
        let result = exp.evaluateAndReplace();
        if (result == null) {
            // 计算不了或跳过的情况 
            return false;
        }

        Object.assign(this.sourcemapData, result);
        return true;
    }
    findRoot(path) {
        // 子能找到父 父找不到子(可能一对多)
        let rootPath = null;
        let curPath = path;
        while (path = path.parentPath) {
            if (isRootParentPath(path)) {
                rootPath = curPath;
                break;
            }
            curPath = path;
        }

        return rootPath;
    }
    traverseNodePath(path) {
        util.debug(`接收到Path`, path)
        // path 只可能为 String Template
        // 已经是I8N的String 用于第二次扫描时判断逻辑
        if (util.parentPathHasTransformed(path)) {
            return;
        }
        // 特殊的语句
        if (shouldExclude(path)) {
            return;
        }
        // root 代表 expression的起点
        let rootPath = this.findRoot(path);
        if (rootPath == null) {
            util.warn('找不到root的场景', path)
            return;
        }
        this.traverseRootPath(rootPath);
    }
    traverseJSXText(textPath) {
        if (!config.fixjsx) {
            // 默认独立解析
            return this.traverseRootPath(textPath);
        }

        let jsxElement = textPath.find((p) => t.isJSXElement(p));
        let childrenPaths = jsxElement.get('children');
        let hasChildElement = childrenPaths.some((child) => t.isJSXElement(child));
        if (!hasChildElement) {
            // 中文 + variable 的情况
            let hasChinese = childrenPaths.some((child) => t.isJSXText(child) && util.hasChinese(child.node.value));
            let hasVariable = childrenPaths.some((child) => t.isJSXExpressionContainer(child));

            if (hasChinese && hasVariable) {
                // 多个path
                let isSuccess = this.buildExpression(childrenPaths);
                if (!isSuccess) {
                    // 回退
                    util.log('尝试整体解析JSXText失败，开始单独解析\n');
                    return this.traverseRootPath(textPath);;
                }
                return;
            }
        }
        // 单独处理JSXText
        return this.traverseRootPath(textPath);
    }
    traverseRootPath(rootPath) {
        util.debug(`开始遍历rootPath：`, rootPath)
        // 仅由StringLiteral/JSXText 且不是中文 构成的expression
        if ((t.isStringLiteral(rootPath) || t.isJSXText(rootPath)) &&
            !util.hasChinese(rootPath.node.value)) {
            return;
        }
        if (util.parentPathHasTransformed(rootPath)) {
            // rootPath在第一个String出现时 就会替换成i18n
            // 但是之前的rootpath下的子节点还是会遍历
            util.debug(`重复遍历的rootPath：`, rootPath)
            return;
        }
        // 是moment
        if (util.isMomentFormat(rootPath)) {
            return;
        }

        this.buildExpression(rootPath)
    }
    getLanguageFromSourcemap(sourcemap) {
        return Object.entries(sourcemap)
            .reduce((accm, [key, o]) => {
                accm[key] = o.template;
                return accm;
            }, {});
    }
    writeLang(sourcemap) {
        let langResource = this.getLanguageFromSourcemap(sourcemap)
        // 多语资源文件
        fileHelper.writeLang(langResource)
    }
    writeResourceByMerge() {
        let oldSourcemap = fileHelper.getSourceMapContent();
        let toWriteSouceMap = this.sourcemapData;
        if (oldSourcemap) {
            toWriteSouceMap = Object.assign(oldSourcemap.data, this.sourcemapData)
        }

        this.writeLang(toWriteSouceMap);
        let nextKeyNum = this.ctx.keyStrategy.count;
        toWriteSouceMap = {
            data: toWriteSouceMap,
            meta: {
                nextKeyNum
            }
        }
        // 映射文件
        fileHelper.writeSourceMap(toWriteSouceMap)
    }
    get changedKeys() {
        return {
            count: this.modifiedKeys.length + this.newKeys.length + this.removedKeys.length,
        };
    }
    get keyLen() {
        return Object.keys(this.sourcemapData).length;
    }
}
module.exports = Traverser;