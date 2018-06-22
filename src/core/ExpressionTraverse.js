let config = require('../config')
let util = require('../core/util')
const fs = require('fs-extra');
const t = require('babel-types')
const p = require('path');
const {
    resourceDir,
    outputDir
} = config;

let Expression = require('./Expression')

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
// 判断是否为rootPath的父亲
function isRootParentPath(path) {
    let {
        node
    } = path;
    let {
        type
    } = node;
    switch (type) {
        case 'BinaryExpression':
            if (rootOperator.includes(node.operator)) {
                return true;
            };
            break;
    }

    return !!ROOT_PARENT_TYPES[type];
}

class FileHelper {
    constructor(basePath) {
        // this.basePath = basePath.replace(/\\/g, '/');
    }
    getTransformFilePath(filePath) {
        filePath = filePath.split(/\/|\\/g).slice(-2);
        return p.resolve(outputDir, ...filePath)
    }
    getResourceFilePath(filaname) {
        return p.resolve(resourceDir, filaname)
    }
    writeResouce(filename, json) {
        let resourcePath = this.getResourceFilePath(filename);
        if (fs.existsSync(resourcePath)) {
            // 如果存在则合并
            let oldJson = fs.readJsonSync(resourcePath);
            json = Object.assign(oldJson, json)
        }
        fs.outputJSONSync(resourcePath, json, {
            encoding: 'utf-8'
        });
    }
    write(filePath, content) {
        if (!config.rewrite) {
            filePath = this.getTransformFilePath(filePath)
        }
        fs.outputFileSync(filePath, content, {
            encoding: 'utf-8'
        });
    }
}

class ExpressionTraverse {
    constructor() {
        this.store = {};
        this.resource = null;
        this.ctx = {}
    }
    start(files) {
        const {
            transformFile,transformCode
        } = require('./transformer');

        let fileHelper = new FileHelper();
        files.forEach((filePath) => {
            // key命名以文件为单位
            this.ctx.keyStrategy = config.strategy.keyStrategyFactory();

            // 需要先format
            let rawCode = String(fs.readFileSync(filePath));
            rawCode = rawCode.replace(/\t/g,'    '); 
            fs.outputFileSync(filePath,rawCode);

            const code = transformFile(filePath)
            // 文件更新替换为 i18n.get 
            fileHelper.write(filePath, code);
        });
        // 资源文件
        fileHelper.writeResouce('source.json', this.sourceInfo)
        fileHelper.writeResouce('ZH-CN.json', this.langResource)
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
    traverse(path) {
        // root 代表 expression的起点
        // jsx无法判断明确的起点
        let rootPath = this.findRoot(path);
        util.assert(rootPath == null, '找不到root的场景', path)
        // root为ArrayExpression 此时有多个 elements
        // 不一定扁平 ['we',{d:'ewe'}] 因此要单独对每一个child 处理
        this.traverseByRoot(rootPath);
    }
    traverseJSXText(textPath) {
        let jsxElement = textPath.find((p) => t.isJSXElement(p));
        let childrenPaths = jsxElement.get('children');
        let hasChildElement = childrenPaths.some((child) => t.isJSXElement(child));
        if (!hasChildElement) {
            // 中文 + variable 的情况
            let hasChinese = childrenPaths.some((child) => t.isJSXText(child) && util.isChinese(child.node.value));
            let hasVariable = childrenPaths.some((child) => t.isJSXExpressionContainer(child));

            if (hasChinese && hasVariable) {
                // 多个path
                return this.buildExpression(childrenPaths);
            }
        }
        // 默认单独处理JSXText
        return this.traverseByRoot(textPath);
    }
    buildExpression(rootPath) {
        let exp = new Expression(rootPath,this.ctx)
        let result = exp.evaluate();
        if (result == null) {
            // 计算不了的情况 
            return;
        }

        Object.assign(this.store, result);
    }
    traverseByRoot(rootPath) {
        util.log(`开始遍历节点`, rootPath)
        // 仅由StringLiteral/JSXText 且不是中文 构成的expression
        if ((t.isStringLiteral(rootPath) || t.isJSXText(rootPath)) &&
            !util.isChinese(rootPath.node.value)) {
            return;
        }
        if (util.hasTransformedPath(rootPath)) {
            // 已经是 i18n 函数
            util.warn(`重复遍历的rootPath$`, rootPath)
            return;
        }
        // 是moment
        if (util.isMomentFormat(rootPath)) {
            return;
        }

        this.buildExpression(rootPath)
    }

    get keyLen() {
        return Object.keys(this.store).length;
    }
    get langResource() {
        if (this.resource == null) {
            this.resource = Object.entries(this.store).reduce((accm, [key, o]) => {
                accm[key] = o.template;
                return accm;
            }, {})
        }
        return this.resource;
    }
    get sourceInfo() {
        return this.store;
    }
}
module.exports = new ExpressionTraverse();