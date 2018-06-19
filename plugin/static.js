let util = require('../core/util')
let t = require('babel-types')

// 静态visitor要去除动态的情况
let staticVisitor = {
    StringLiteral(path){
        const { node } = path;
        const { value } = node;
        if(!util.isChinese(value)){
            return;
        }
        if (path.parent.type === "CallExpression"
        && path.parent.callee.type === "MemberExpression" 
        && path.parent.callee.object.name === "i18n") {
            // 转换后的ast也会遍历，防止递归
            return;
        }
        // path.replaceWithSourceString(`intl.get('${value}')`);
        path.replaceWith(t.CallExpression(
            t.MemberExpression(t.identifier('i18n'), t.identifier('get')),
            [t.StringLiteral(value)]
        ))
        // if (path.parent.type === "CallExpression") {
        //     if (
        //         path.parent.callee.type === "MemberExpression" &&
        //         path.parent.callee.object.name === "intl"
        //     ) {
        //         return;
        //     }
        //     path.replaceWithSourceString(`intl.get('${value}')`);
        // }
        // if (path.parent.type === "JSXAttribute") {
        //     path.replaceWith(t.JSXExpressionContainer(makeReplace(value.trim())));
        // } else {
        //     path.replaceWithSourceString(`intl.get('${value}')`);
        // }
        
      },
    JSXAttribute(path) {
        const { node } = path;
        if (node.name.name !== 'defaultMessage' && path.node.value) {
            detectChinese(node.value.value, path, 'jsx', 'JSXAttribute');
        }
    },
    JSXText(path) {
        const { node } = path;
        detectChinese(node.value, path, 'jsx', 'JSXText');
    },
    AssignmentExpression(path) {
        detectChinese(path.node.right.value, path, 'text', 'AssignmentExpression');
    },
    ObjectProperty(path) {
        detectChinese(path.node.value.value, path, 'text', 'ObjectProperty');
    },
    ArrayExpression(path) {
        path.node.elements.forEach(item => {
            if (item.value) {
                detectChinese(item.value, Object.assign({}, path, {node: item}), 'text', 'ArrayExpression');
            }
        })
    },
    // 新增：new Person('小红')
    NewExpression(path) {
        path.node.arguments.forEach(item =>{
            detectChinese(item && item.value, path, 'text', 'NewExpression');
        });
    },
    // 新增：函数调用；cb('这是一个错误')
    CallExpression(path) {
        if (path.node.callee && path.node.callee.object) {
            if (path.node.callee.object.name === 'console') {
                return;
            }
            if (path.node.callee.object.name === 'React') {
                return;
            }
        }
        
        path.node.arguments.forEach(item =>{
            detectChinese(item && item.value, path, 'text', 'CallExpression');
        });
    },
    // 新增：case '这是中文'；switchStatement, 
    SwitchCase(path) {
        if (path.node && path.node.test) {
            detectChinese(path.node.test.value, path, 'text', 'SwitchCase');
        }
    }
}

  module.exports = staticVisitor