let config = require('../config')
let {
    prefix,
    suffix
} = config.interpolation;

let util = require('../util')
const variableOperator = ['-', '*', '/'];
const t = require('babel-types')
const {
    VariableStrategy
} = require('./strategy')

// a+1+'s'+2+b
function isVariableNumerLiteral(left, right) {
    return (t.isCallExpression(left) || t.isIdentifier(left)) &&
        t.isNumericLiteral(right)
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

class Expression {
    constructor(path, ctx) {
        // rootPath可能是数组  如：JSXElment的children
        this.curRootPath = path;
        this.keyInfo = null;
        this.ctx = ctx;
        this.variableStrategy = new VariableStrategy();
    }
    staticCaseHandler(path) {
        let node = path.node;
        switch (node.type) {
            case 'StringLiteral':
                return {
                    template: node.value
                };
            case 'JSXText':
                return {
                    template: node.value.trim()
                };
        }
        return null;
    }

    variableCaseHandler(path) {
        let node = path.node;
        let param = null;
        switch (node.type) {
            case 'JSXEmptyExpression': //空语句不管
                return {}
                break;
            case 'JSXExpressionContainer':
                return this.recursiveCall(path.get('expression'));
                break;
            case 'UnaryExpression': // 一元表达式
            case 'LogicalExpression':
            case 'CallExpression':
            case 'MemberExpression':
            case 'ConditionalExpression':
                param = `${util.getSource(path)},`
                break;
            case 'BinaryExpression': //数学运算
                let {
                    operator
                } = node;
                if (variableOperator.includes(operator)) {
                    param = `${util.getSource(path)},`
                } else if (operator === '+') { // 由字符串入口进来
                    let {
                        left,
                        right
                    } = node;
                    if (isVariableNumerLiteral(left, right) ||
                        isVariableNumerLiteral(right, left)) {
                        param = `${util.getSource(path)},`
                    }
                }
                break;
            case 'Identifier':
                param = `${node.name},`
                break;
        }
        if (param) {
            let variableName = this.variableStrategy.get();
            param = `${variableName}:${param}`;
            let template = `${prefix}${variableName}${suffix}`;
            return {
                param,
                template
            }
        }
        return null;
    }

    dynamicCaseHandler(path) {
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

                let leftResult = this.recursiveCall(left);
                let rightResult = this.recursiveCall(right);
                return mergeResult(leftResult, rightResult);

            case 'TemplateLiteral':
                let param = [];
                let template = '';
                const expressions = path.get("expressions");
                let index = 0;
                for (const elem of (path.node.quasis)) {
                    if (elem.value.cooked) {
                        template += elem.value.cooked;
                    }

                    if (index < expressions.length) {
                        const expr = expressions[index++];
                        // 简单处理 认为expr都是变量 
                        let variableName = this.variableStrategy.get();
                        template += `${prefix}${variableName}${suffix}`;
                        param.push(`${variableName}:${util.getSource(expr)}`);
                    }
                }
                if (!util.hasChinese(template)) {
                    return {};
                }
                //  param格式为`${variableName}:${node.name},`
                param = param.join(',')

                return {
                    template,
                    param
                }

        }
        return null;
    }

    recursiveCall(path) {
        let result = null;
        // 仅是静态模板
        if (result = this.staticCaseHandler(path)) {
            return result;
        }
        // 仅是变量
        if (result = this.variableCaseHandler(path)) {
            return result;
        };
        // 组合
        if (result = this.dynamicCaseHandler(path)) {
            return result;
        };

        // 不能处理
        throw new Error('can not resolve expression')
    }

    evaluatePath(path) {
        let result = {};
        // 表达式由多个子path构成
        if (Array.isArray(path)) {
            for (let onePath of path) {
                let partialResult = this.recursiveCall(onePath);
                result = mergeResult(result, partialResult);
            }
        } else {
            result = this.recursiveCall(path)
        }
        return result;

    }
    evaluateAndReplace() {
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
        if (!util.hasChinese(template)) {
            return null;
        }
        // 替换ast
        let str = this.buildReplaceStr(template, param);
        this.replaceSource(str)
        return this.keyInfo;
    }
    buildReplaceStr(template, param) {
        let path = util.safePath(this.curRootPath);
        if (t.isJSXText(path.node) || t.isJSXAttribute(path.parent)) {
            // JSXText JSXAttribute 去除冒号 回车
            template = template.replace(/\s+|[:：]\s*$/g, '');
        }
        // 一个表达式一个key
        let key = this.ctx.keyStrategy.get({
            template,
        });
        this.keyInfo = {
            [key]: util.getKeyInfo(path, template)
        }
        let comment = util.makeComment(this.ctx.commentStrategy.get({
            template,
            sourceStr: util.getSource(path)
        }));
        let replaceStr = `${config.callStatement}('${key}')${comment}`;
        if (param) {
            // eslint没有,
            param = param.replace(/,$/,'');
            replaceStr = `${config.callStatement}('${key}',{${param}})${comment}`;
        }
        return replaceStr;
    }
    replaceSource(replaceStr) {
        let path = util.safePath(this.curRootPath);

        try {
            let {
                expression
            } = util.parseStr(replaceStr);
            // 特殊情况处理 []
            // jsx 
            if (Array.isArray(this.curRootPath)) {
                if (t.isJSXElement(path)) {
                    path.node.children = [t.JSXExpressionContainer(expression)];
                } else {
                    util.throwError('不能解析的数组path', path)
                }
            } else if (t.isJSXText(path.node)) {
                // 通过正则拿到JSXText左右的 &nbsp; 和冒号
                let srcCode = util.getSource(path, false);
                let regex = new RegExp(`^((?:(?:&nbsp;)|\\s)*)[\\s\\S]*?((?:(?:&nbsp;)|[\\s:：])*)$`);
                let matchResult = srcCode.match(regex);
                util.assert(matchResult != null, 'JSXText正则写错了!!!', path)
                let [, prefixPadding, suffixPadding] = matchResult;
                path.replaceWithMultiple([
                    t.JSXText(prefixPadding),
                    t.JSXExpressionContainer(expression),
                    t.JSXText(suffixPadding)
                ]);
            } else if (t.isJSXAttribute(path.parent)) {
                let value = path.node.value;
                let sign = value.match(/[:：]$/);
                if(sign){ // 冒号结尾
                    path.replaceWith(
                        t.JSXExpressionContainer(
                            t.BinaryExpression('+',expression,t.stringLiteral(sign[0]))
                        )
                    );
                }else{
                    path.replaceWith(
                        t.JSXExpressionContainer(expression)
                    );
                }
                
            } else if (t.isObjectProperty(path.parent) &&
                path.parentKey === 'key') { //对象属性的key { [‘中国’] }
                path.parentPath.node.computed = true;
                path.replaceWith(expression)
            } else {
                path.replaceWith(expression)
            }
        } catch (err) {
            util.error(`表达式替换失败:${err.message}\n${replaceStr}`, path)
        }
    }
}

module.exports = Expression;