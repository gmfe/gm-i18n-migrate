const config = require('./config')
const fileHelper = require('./core/fileHelper')
const recast = require('recast')
const codeFrameColumns = require('babel-code-frame');
const t = require('babel-types')

exports.isChinese = (text) => {
    return /[\u4e00-\u9fa5]/.test(text);
}

exports.hasTransformedString = (path) => {
    return this.hasTransformedPath(path.parentPath)
}
exports.hasTransformedPath = (path) => {
    if (t.isCallExpression(path.node) &&
        t.isMemberExpression(path.node.callee)) {
        let name = path.node.callee.object.name
        let fn = path.node.callee.property.name
        if (`${name}.${fn}` === config.callStatement) {
            return true;
        }
    }
    return false;
}

exports.isMomentFormat = (rootPath) => {
    let parentNode = rootPath.parent;
    return t.isCallExpression(parentNode) &&
        t.isMemberExpression(parentNode.callee) &&
        t.isIdentifier(parentNode.callee.property) &&
        parentNode.callee.property.name === 'format'
}

exports.parseStr = (str) => {
    return recast.parse(str).program.body[0];
}
exports.getKeyInfo = (path, template) => {
    return {
            ...this.getMetaFromPath(path),
            template,
        
    };
}
exports.getMetaFromPath = (path) => {
    path = this.safePath(path)
    let info = {
        filename: fileHelper.formatFilePath(path.hub.file.log.filename),
        source: this.getSource(path),
        location: this.getLocation(path)
    };

    return info
}
exports.getLocation = (path) => {
    path = this.safePath(path)
    let loc = path.node.loc;
    if (loc) {
        let {
            start,
            end
        } = loc
        return `${start.line}:${start.column}-${end.line}:${end.column}`;
    }
    return '';
}
exports.getErrorMsg = (msg, path) => {
    path = this.safePath(path)
    const {
        node
    } = path;
    const rawCode = path.hub.file.code;
    let extraInfo = `${JSON.stringify(this.getMetaFromPath(path))}`;
    if (node.loc) {
        let {
            line,
            column
        } = node.loc.start
        extraInfo = `${path.hub.file.log.filename}:${line}:${column}
      ${codeFrameColumns(rawCode, line, column, {highlightCode:true})}`;
    }
    const errMessage = `${msg}\n${extraInfo}`;
    return errMessage;
}
exports.makeComment = (comment) => {
    comment = `${comment.replace(/\/\*/, 'Comment: ').replace(/\*\//, ' :Comment')}`;
    return comment ? `/* ${comment} */` : ''
}
exports.getSource = (p, trim = true) => {
    let code = this.safePath(p).getSource()
    return trim ? code.trim() : code;
    // return this.getSourceFromLoc(this.safePath(p))
}

exports.safePath = (path) => {
    if (Array.isArray(path)) {
        return path[0].parentPath;
    }
    return path;
}
exports.error = (msg, path) => {
    if (config.debug) {
        throw new Error(this.getErrorMsg(msg, path));
    }
    this.warn(msg, path);
}
exports.throwError = (msg, path) => {
    throw new Error(this.getErrorMsg(msg, path));
}
exports.log = (msg) => {
    return console.log.call(console, msg);
}
exports.debug = (msg, path) => {
    if (config.debug) {
        return console.log.call(console, `debug:${msg}\n${JSON.stringify(this.getMetaFromPath(path))}`);
    }
}
exports.warn = (msg, path) => {
    return console.warn.call(console, this.getErrorMsg(msg, path));
}
exports.assert = (condition, msg, path) => {
    if (!condition) {
        this.throwError(msg, path);
    }
}
exports.escapeRegExp = (str) => {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}