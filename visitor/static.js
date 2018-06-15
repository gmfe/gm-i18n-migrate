let util = require('../util')
let t = require('babel-types')
let staticVisitor = {}

staticVisitor.StringLiteral = (path)=> {
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
    
  }

  module.exports = staticVisitor