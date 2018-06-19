let config = require('../config')
let util = require('../core/util')
let {
    prefix,
    suffix
} = config.interpolation;
const {
    transform
} = require('./transformer')
const fs = require('fs-extra');
const t = require('babel-types')
const p = require('path');
const { resourceDir, outputDir } = config;

const ROOT_PARENT_TYPES = {
    ObjectProperty:true,  // 对象属性
    ConditionalExpression:true, // 条件
    VariableDeclarator:true, // 变量初始化
    AssignmentExpression:true, // 赋值语句
    ReturnStatement:true,  // 返回语句
    JSXExpressionContainer:true,  // jsx表达式
    JSXAttribute:true, // jsx属性 
    ArrayExpression:true, // 数组
    CallExpression:true, // 函数调用
}
// 判断是否为rootPath的父亲
function isRootParentPath(path) {
    let { node } = path;
    let { type } = node;
    switch (type) {
        case 'BinaryExpression':
            if (node.operator.startsWith('==') ||
                node.operator.startsWith('!=')) {
                return true;
            };
            break;
    }

    return !!ROOT_PARENT_TYPES[type];
}

class TraverseHistory {
    constructor() {
        this.cache = new Map();
    }
    hashCode(path) {
        let { loc } = path.node;
        if (loc == null) {
            throw new Error('empty loc')
        }
        let { start, end } = loc;
        return `${path.hub.file.log.filaname}:${start.line},${start.column}-${end.line},${end.column}`
    }
    add(path) {
        this.cache.set(this.hashCode(path), true);
    }
    has(path) {
        return this.cache.has(this.hashCode(path));
    }
}

const STATIC_CASE_HANDLER = {
    StringLiteral({
        node
    }) {
        return {
            template: node.value
        };
    },
    JSXText({
        node
    }) {
        return {
            template: node.value
        };
    },
}

const VARIABLE_CASE_HANDLER = {
    CallExpression(path) {
        let variableName = config.strategy.variableStrategy({});
        let template = `${prefix}${variableName}${suffix}`
        let param = `${variableName}:${path.getSource()},`
        return {
            template,
            param
        }
    },
    MemberExpression(path) {
        return VARIABLE_CASE_HANDLER.CallExpression(path);
    },
    ConditionalExpression(path) {
        return VARIABLE_CASE_HANDLER.CallExpression(path);
    },
    Identifier({
        node
    }) {
        let variableName = config.strategy.variableStrategy({});
        let template = `${prefix}${variableName}${suffix}`
        let param = `${variableName}:${node.name},`
        return {
            template,
            param
        }
    },
}

function assignResult(...targets) {
    let dest = {
        template: '',
        param: ''
    }
    for (let target of targets) {
        dest.template += target.template;
        if (target.param) {
            dest.param += target.param;
        }
    }
    return dest;
}

// 组合类型 
const DYNAMIC_CASE_HANDLER = {
    BinaryExpression(path) {
        let {
            operator
        } = path.node;
        let left = path.get('left')
        let right = path.get('right')
        if (operator !== '+') {
            // TODO
            return {};
        }

        let leftResult = recursive(left);
        let rightResult = recursive(right);
        return assignResult(leftResult, rightResult);
    },
    TemplateLiteral(path) {
        // 模板直接正则来做
        let sourceStr = path.getSource();
        let param = [];
        //  param格式为`${variableName}:${node.name},`
        let template = sourceStr.replace(/([\s\S]*?\${)([\w\.\[\]]+?)(}[\s\S]*?)/g, (m, $1, $2, $3) => {
            let variableName = config.strategy.variableStrategy({});
            param.push(`${variableName}:${$2}`);
            return `${$1}${variableName}${$3}`
        })
            .replace(/^`([\s\S]*)`$/, '$1')
        param = param.join(',')
        return {
            template,
            param
        }

    },

}

function recursive(path) {
    let {
        type
    } = path.node;
    let handler;
    // 仅是静态模板
    if (handler = STATIC_CASE_HANDLER[type]) {
        return handler(path)
    }
    // 仅是变量
    if (handler = VARIABLE_CASE_HANDLER[type]) {
        return handler(path)
    };

    // 动态模板 与 字符串组合而成
    if (handler = DYNAMIC_CASE_HANDLER[type]) {
        return handler(path)
    }

    // TODO 不能处理 跳过？
    util.warn(`不能处理该类型${type}:${path.getSource()}`)
    return {};
}

class Expression {
    constructor(path) {
        this.curRootPath = path;
        this.resourceInfo = null;
    }
    calculate() {
        // 递归得出表达式的template和param
        let {
            template,
            param
        } = recursive(this.curRootPath);
        if (template == null) {
            // 不用处理的场景 //复杂对象，放弃
            return null;
        }
        this.replaceSource(template, param)
        return this.resourceInfo;
    }
    getPath() {
        return this.curRootPath;
    }
    replaceSource(template, param) {
        // 一个表达式一个key
        let key = config.strategy.keyStrategy({});
        let path = this.curRootPath;
        // 记录替换之前node的信息
        let oldLoc = path.node.loc;
        this.resourceInfo = {
            [key]: {
                ...util.getMetaFromPath(path),
                template,
            }
        };

        let comment = `/* src:${path.getSource().trim()} - tpl:${template.trim()} */`;
        let sourceStr = `${config.callStatement}('${key}')${comment}`;
        if (param) {
            sourceStr = `${config.callStatement}('${key}',{${param}})${comment}`;
        }

        let { expression } = util.parseStr(sourceStr);
       
        // 特殊情况处理 []
        // jsx 
        if (path.node.type === 'JSXText'
            || path.parent.type === 'JSXAttribute') {
            path.replaceWith(
                t.JSXExpressionContainer(expression)
            );
        } else {
            path.replaceWith(expression)
        }
        path.node.loc = oldLoc; // 修复loc 用于hash防止多次遍历节点
        util.log(`替换表达式: ${sourceStr}`, JSON.stringify(this.resourceInfo))
    }

}


function getOutputDir(filePath) {
    filePath = filePath.split(p.sep).slice(-2, -1);
    return p.join(outputDir, ...filePath)
}

function getTransformFilePath(filePath) {
    let filaname = filePath.split('/').slice(-1);
    return p.join(getOutputDir(filePath), ...filaname)
}

function getResourceFilePath(filaname) {
    return p.join(resourceDir, filaname)
}


function write(filePath, content, type) {
    if (!type && !config.rewrite) {
        filePath = getTransformFilePath(filePath)
    }

    fs.outputFileSync(filePath, content, {
        encoding: 'utf-8'
    });
}
class ExpressionTraverse {
    constructor() {
        this.history = new TraverseHistory();
        this.store = {};
    }
    execute(files) {
        const transformPlugin = require('../plugin')
        // fs.removeSync(outputDir);
        files.forEach((filePath) => {
            // if(!filePath.includes('test')){
            //     return;
            // }
            const code = transform(filePath, transformPlugin)
            // 文件更新替换为 i18n.get 
            write(filePath, code);
        });
        // 资源文件
        write(getResourceFilePath('cn.json'), this.resourceContent, 'resource')
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
        util.assert(rootPath == null,'找不到root',path)
        // root为ArrayExpression 此时有多个 elements
        // 不一定扁平 ['we',{d:'ewe'}] 因此要单独对每一个child 处理
        this.traverseByRoot(rootPath);
    }

    traverseByRoot(rootPath) {
        util.log(`开始遍历节点\n${JSON.stringify(util.getMetaFromPath(rootPath))}`)
        // 已经替换过的path
        // if (this.history.has(rootPath)) {
        //     return;
        // }
        // 仅由StringLiteral/JSXText 且不是中文 构成的expression
        if (STATIC_CASE_HANDLER[rootPath.node.type]
            && !util.isChinese(rootPath.node.value)) {
            return;
        }
        if (util.hasTransformedPath(rootPath)) {
            // 计算过了的 // 理论上skip应不会遍历到，临时解决 
            return;
        }
        let exp = new Expression(rootPath)
        let result = exp.calculate();
        if (result == null) {
            // 计算不了的情况 ['e',{a:{f:'d'},}] if(a=='c')
            return;
        }

        Object.assign(this.store, result);
        // 新生成的节点不用遍历 rootPath.skip(); 之后还是会遍历
        // this.history.add(exp.getPath());
    }

    get resourceContent() {
        return JSON.stringify(this.store);
    }

}
module.exports = new ExpressionTraverse();