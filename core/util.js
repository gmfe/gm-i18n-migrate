const config = require('../config')
const recast = require('recast')
const CodeFrameError = require('./CodeFrameError')

exports.isChinese = (text) => {
    return /[\u4e00-\u9fa5]/.test(text);
}

exports.hasTransformed = (path) => {
    if (path.parent.type === "CallExpression" &&
        path.parent.callee.type === "MemberExpression") {
        let name = path.parent.callee.object.name
        let fn = path.parent.callee.property.name
        if (`${name}.${fn}` === config.callStatement) {
            return true;
        }
        // 已经转换过
    }
    return false;
}
exports.hasTransformedPath = (path) => {
    if (path.node.type === "CallExpression" &&
        path.node.callee.type === "MemberExpression") {
        let name = path.node.callee.object.name
        let fn = path.node.callee.property.name
        if (`${name}.${fn}` === config.callStatement) {
            return true;
        }
    }
    return false;
}



exports.parseStr = (str) => {
    return recast.parse(str).program.body[0];
}
exports.getMetaFromPath = (path) => {
    let {
        start,
        end
    } = path.node.loc;
    return {
        filename: path.hub.file.log.filename,
        source: path.getSource(),
        start: `${start.line}:${start.column}`,
        end: `${end.line}:${end.column}`,
    };
}

exports.throwError = (msg, path) => {
    if (path) {
        throw new CodeFrameError(path, msg);
    }
    throw new Error(msg);
}

exports.log = (...args) => {
    return console.log.call(console, ...args);
}
exports.warn = (...args) => {
    return console.warn.call(console, ...args);
}
exports.assert = (condition, msg, path) => {
    if (condition) {
        this.throwError(msg, path);
    }
}