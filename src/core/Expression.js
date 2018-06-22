let config = require('../config')
let {
    prefix,
    suffix
} = config.interpolation;

let util = require('../core/util')
const variableOperator = ['-', '*', '/'];
const t = require('babel-types')

// a+1+'s'+2+b
function isVariableNumerLiteral(left, right) {
    return (t.isCallExpression(left) || t.isIdentifier(left)) &&
        t.isNumericLiteral(right)
}

function staticCaseHandler(path) {
    let node = path.node;
    switch (node.type) {
        case 'StringLiteral':
        case 'JSXText':
            return {
                template: node.value
            };
    }
    return null;
}

function variableCaseHandler(path) {
    let node = path.node;
    let variableName = config.strategy.variableStrategy({path});
    let template = `${prefix}${variableName}${suffix}`;
    let param = null;
    switch (node.type) {
        case 'JSXEmptyExpression': //空语句不管
            return {}
            break;
        case 'JSXExpressionContainer':
            return variableCaseHandler(path.get('expression'));
            break;
        case 'LogicalExpression':
        case 'CallExpression':
        case 'MemberExpression':
        case 'ConditionalExpression':
            param = `${variableName}:${util.getSource(path)},`
            break;
        case 'BinaryExpression': //数学运算
            let {
                operator
            } = node;
            if (variableOperator.includes(operator)) {
                param = `${variableName}:${util.getSource(path)},`
            } else if (operator === '+') { // 由字符串入口进来
                let {
                    left,
                    right
                } = node;
                if (isVariableNumerLiteral(left, right) ||
                    isVariableNumerLiteral(right, left)) {
                    param = `${variableName}:${util.getSource(path)},`
                }
            }
            break;
        case 'Identifier':
            param = `${variableName}:${node.name},`
            break;
    }
    if (param) {
        return {
            param,
            template
        }
    }
    return null;
}

function dynamicCaseHandler(path) {
    let node = path.node;
    switch (node.type) {
        case 'BinaryExpression':
            let {
                operator
            } = path.node;
            let left = path.get('left')
            let right = path.get('right')
            if (operator !== '+') {
                // +认为是字符串相加 数字的相加在variableCase解决
                return null;
            }

            let leftResult = recursiveCall(left);
            let rightResult = recursiveCall(right);
            return mergeResult(leftResult, rightResult);

        case 'TemplateLiteral':
            // 模板直接正则来做
            let param = [];
            //  param格式为`${variableName}:${node.name},`
            let template = '';

            const expressions = path.get("expressions");
            let index = 0;
            for (const elem of (path.node.quasis)) {
                // 字符
                if (elem.value.cooked) {
                    template += elem.value.cooked;
                }

                if (index < expressions.length) {
                    const expr = expressions[index++];
                    // 认为expr都是变量 省略不必要的判断
                    let variableName = config.strategy.variableStrategy({});
                    template+=`${prefix}${variableName}${suffix}`;
                    param.push(`${variableName}:${util.getSource(expr)}`);
                }
            }
            if (!util.isChinese(template)) {
                return {};
            }
            param = param.join(',')

            return {
                template,
                param
            }

    }
    return null;
}

function mergeResult(...targets) {
    let dest = {
        template: '',
        param: ''
    }
    for (let target of targets) {
        if (target.template) {
            dest.template += target.template;
        }
        if (target.param) {
            dest.param += target.param;
        }
    }
    return dest;
}

function recursiveCall(path) {
    let result = null;
    // 仅是静态模板
    if (result = staticCaseHandler(path)) {
        return result;
    }
    // 仅是变量
    if (result = variableCaseHandler(path)) {
        return result;
    };
    // 动态模板 与 字符串组合而成
    if (result = dynamicCaseHandler(path)) {
        return result;
    };

    // 不能处理返回 
    throw new Error('can not resolve expression')
    // TODO 顶层不能处理返回 null 后面返回getSource()容错?
    //return {
    // template:util.getSource(path)
    //};
}


class Expression {
    constructor(path,ctx) {
        // rootPath可能是数组  JSXElment的children
        this.curRootPath = path;
        this.resourceInfo = null;
        this.ctx = ctx;
    }
    evaluatePath(path) {
        let result = {};
        // 表达式由多个子path构成
        if (Array.isArray(path)) {
            for (let onePath of path) {
                let partialResult = recursiveCall(onePath);
                result = mergeResult(result, partialResult);
            }
        } else {
            result = recursiveCall(path)
        }
        return result;

    }
    evaluate() {
        // 递归得出表达式的template和param
        let expResult;
        try {
            expResult = this.evaluatePath(this.curRootPath);
        } catch (e) {
            util.warn(`${e.message}:解析表达式失败;`, this.curRootPath)
            // 不能处理的场景 1+a+'s'
            return null;
        }
        let {
            template,
            param
        } = expResult;
        if (template == null) {
            // 不用处理
            return null;
        }
        // template没有中文
        if (!util.isChinese(template)) {
            return null;
        }

        this.replaceSource(template, param)
        return this.resourceInfo;
    }
    getPath() {
        return this.curRootPath;
    }
    replaceSource(originalTemplate, param) {
        let path = this.curRootPath;
        let resouceTemplate = originalTemplate;

        if(t.isJSXText(path.node)){
             // JSXText去除冒号
             resouceTemplate = originalTemplate.replace(/(:|：)$/g, ''); 
        }

        if(t.isJSXText(path.node)){
          // 去除JSXText回车
          resouceTemplate = resouceTemplate.replace(/\n+/g,'');
        }
        // 一个表达式一个key
        let key = this.ctx.keyStrategy({
            template:resouceTemplate, path
        });
        this.resourceInfo = {
            [key]: {
                ...util.getMetaFromPath(path),
                template:resouceTemplate,
            }
        };
        let comment = util.makeComment(config.strategy.commentStrategy({
            template:resouceTemplate,
            sourceStr: util.getSource(path)
        }));
        let replaceStr = `${config.callStatement}('${key}')${comment}`;
        if (param) {
            replaceStr = `${config.callStatement}('${key}',{${param}})${comment}`;
        }

        try {
            let {
                expression
            } = util.parseStr(replaceStr);
            // 特殊情况处理 []
            // jsx 
            if (Array.isArray(path)) {
                let parentPath = path[0].parentPath;
                if (t.isJSXElement(parentPath)) {
                    parentPath.node.children = [t.JSXExpressionContainer(expression)];
                } else {
                    util.throwError('不能解析的数组path', parentPath)
                }
            } else if (t.isJSXText(path.node)) {
             
                // let srcCode = util.getSource(path, false);
                // let regex = new RegExp(`^((?:(?:&nbsp;)|\\s)*)${util.escapeRegExp(originalTemplate.trim())}((?:(?:&nbsp;)|[\\s:：])*)$`);
                // let matchResult = srcCode.match(regex);
                // util.assert(matchResult == null, 'JSXText正则写错了', path)
                // let [, prefixPadding, suffixPadding] = matchResult;

                let suffix = /[:：]/.test(originalTemplate)?':':'';
                path.replaceWithMultiple([
                    t.JSXExpressionContainer(expression),
                    t.JSXText(suffix)
                ]);
            }
            else if (t.isJSXAttribute(path.parent)) {
                path.replaceWith(
                    t.JSXExpressionContainer(expression)
                );
            } else if (t.isObjectProperty(path.parent) &&
                path.parentKey === 'key') { //对象属性的key { [‘中国’] }
                path.parentPath.node.computed = true;
                path.replaceWith(expression)
            } else {
                path.replaceWith(expression)
            }
        } catch (err) {
            util.throwError(`表达式替换失败:${err.message}\n${replaceStr}`, path)
        }
    }

}

module.exports = Expression;