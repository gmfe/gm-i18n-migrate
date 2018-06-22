const config = require('../config')
const recast = require('recast')
const codeFrameColumns = require('babel-code-frame');
const t = require('babel-types')

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

exports.isMomentFormat = (rootPath) => {
    let parentNode = rootPath.parent;
    return t.isCallExpression(parentNode)
        && t.isMemberExpression(parentNode.callee)
        && t.isIdentifier(parentNode.callee.property)
        && parentNode.callee.property.name === 'format'
}

exports.parseStr = (str) => {
    return recast.parse(str).program.body[0];
}
exports.getMetaFromPath = (path) => {
    path = this.safePath(path)
    let info = {
        filename: path.hub.file.log.filename,
        source: this.getSource(path),
    };
   let loc = path.node.loc;
   if(loc){
    let {
        start,
        end
    } = loc
    info.start = `${start.line}:${start.column}`;
    info.end = `${end.line}:${end.column}`;
   }
    return info
}
exports.getErrorMsg = (msg,path)=>{
    path = this.safePath(path)
    const { node } = path;
    const rawCode = path.hub.file.code;
    let extraInfo = `${JSON.stringify(this.getMetaFromPath(path))}`;
    if (node.loc) {
      let { line, column } = node.loc.start
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
exports.getSource = (p)=>{
    // return this.safePath(p).getSource().trim();
    return this.getSourceFromLoc(this.safePath(p))
}
exports.getSourceFromLoc = (path)=>{
    let code = path.hub.file.code;
    let {start,end} = path.node.loc;

    let srcCode = []
    let {column:sColumn,line:sRow} = start;
    let {column:eColumn,line:eRow} = end;
    const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;
    const lines = code.split(NEWLINE);
    if(eRow === sRow){
        srcCode.push(lines[sRow-1].slice(sColumn,eColumn));
    }else{
        while(sRow<eRow){
            srcCode.push(lines[sRow-1].slice(sColumn));
            sRow++;
        }
        srcCode.push(lines[sRow-1].slice(0,eColumn))
        console.log(srcCode);
    }
    return srcCode.join('');
}

exports.safePath = (path)=>{
    if(Array.isArray(path)){
        return path[0].parentPath;
    }
    return path;
}
exports.throwError = (msg, path) => {
    if(config.debug){
        throw new Error(this.getErrorMsg(msg, path));
    }
    this.warn(msg, path);
}

exports.log = (msg,path) => {
    if(config.debug){
        return console.log.call(console, `${msg}\n${JSON.stringify(this.getMetaFromPath(path))}`);
    } 
}
exports.warn = (msg,path) => {
    return console.warn.call(console, this.getErrorMsg(msg,path));
}
exports.assert = (condition, msg, path) => {
    if (condition) {
        this.throwError(msg, path);
    }
}