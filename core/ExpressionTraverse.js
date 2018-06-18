let config = require('../config')
let util = require('../core/util')
let {
    prefix,
    suffix
} = config.interpolation;

const ROOT_TYPES = {
    VariableDeclarator(path) { // 变量初始化
        return path.get('init');
    },
    AssignmentExpression(path) { // 赋值语句
        return path.get('right')
    },
    ReturnStatement(path) { // 返回语句
        return path.get('right');
    },
}

class TraverseHistory {
    constructor() {
        this.cache = new Map();
    }
    hashCode(node) {
        let {
            loc: {
                start,
                end
            }
        } = node;
        return `loc:${start.line},${start.column}-${end.line},${end.column}`
    }
    add(node) {
        this.cache.set(this.hashCode(node), true);
    }
    has(node) {
        return this.cache.has(this.hashCode(node));
    }
}

const STATIC_CASE_HANDLER = {
    StringLiteral({
        node
    }) {
        return {
            template: node.value
        };
    }
}

let VARIABLE_CASE_HANDLER = {
    ConditionalExpression(path) {
        let variableName = config.strategy.variableStrategy({});
        let template = `${prefix}${variableName}${suffix}`
        let param = `${variableName}:${path.getSource()},`
        return {
            template,
            param
        }
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
            return;
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
        .replace(/^`([\s\S]*)`$/,'$1')
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

    // TODO throw Error
}

class Expression {
    constructor(path) {
        this.curPath = path;
        this.resourceInfo = null;
    }
    calculate() {
        // 一个表达式一个key
        let key = config.strategy.keyStrategy({});
        // 递归得出表达式的template和param
        let {
            template,
            param
        } = recursive(this.curPath);
        this.replaceSource(key, template, param)
        return this.resourceInfo;
    }
    replaceSource(key, template, param) {
        let path = this.curPath;
        // 写入资源文件的信息
        this.resourceInfo = {
            [key]: {
                source:path.getSource(),
                template
            }
        };
        let comment = `/* source:${path.getSource()} - template:${template} */`;

        let sourceStr = `${config.callStatement}('${key}')${comment}`;
        if (param) {
            sourceStr = `${config.callStatement}('${key}',{${param}})${comment}`;
        }
        let result = util.parseStr(sourceStr);
        path.replaceWith(result.expression)
    }

}

class ExpressionTraverse {
    constructor() {
        this.history = new TraverseHistory();
        this.store = {};
    }

    findRoot(path) {
        let rootPath = path.find((path) => {
            let {
                node: {
                    type
                }
            } = path;
            return !!ROOT_TYPES[type]
        });
        let childPath = ROOT_TYPES[rootPath.node.type](rootPath);
        return {
            childPath,
            rootPath
        };
    }
    traverse(path) {
        let {
            rootPath,
            childPath
        } = this.findRoot(path);
        // 已经处理过
        if (this.history.has(rootPath.node)) {
            return;
        }

        let exp = new Expression(childPath);
        Object.assign(this.store, exp.calculate());
        this.history.add(rootPath.node);
    }
    get resourceContent() {
        return JSON.stringify(this.store);
    }

}
module.exports = new ExpressionTraverse();