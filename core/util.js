
const config = require('../config')
const recast = require('recast')

exports.isChinese = (text)=>{
    return /[\u4e00-\u9fa5]/.test(text);
}

exports.hasTransformed = (path) => {
    if (path.parent.type === "CallExpression"
    && path.parent.callee.type === "MemberExpression" ) {
        let name = path.parent.callee.object.name
        let fn = path.parent.callee.property.name
        if(`${name}.${fn}` === config.callStatement){
            return true;
        }
        // 已经转换过
    }
    return false;
}

exports.parseStr = (str)=>{
    return recast.parse(str).program.body[0];
}