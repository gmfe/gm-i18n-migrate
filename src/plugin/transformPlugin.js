let config = require('../config')
let util = require('../util')
const recast = require('recast')

function initVisitor(traverser) {
    return {
        Program: {
            enter(path, state) {
                let c = path.hub.file.code
            },
            exit(path) { // 添加 import
                const imported = path.get("body")
                    .filter(p => p.isImportDeclaration())
                    .reduce((map, p) => {
                        map[p.getSource().trim()] = true;
                        return map;
                    }, {})
                if (imported[config.importStatementStr.trim()]) {
                    return;
                }

                let output = recast.print(path.hub.file.ast).code;
                // 如果使用了i18n
                if (output.includes(config.callStatement)) {
                    let importDeclaration = util.parseStr(config.importStatementStr);
                    path.unshiftContainer('body', importDeclaration);
                }

            }
        },
        StringLiteral(path) {
            traverser.traverseNodePath(path);
        },
        TemplateLiteral(path) {
            traverser.traverseNodePath(path);
        },
        JSXText(path) {
            traverser.traverseJSXText(path)
        },
    }
}

module.exports = (traverser) => {
    return {
        visitor: initVisitor(traverser)
    }
}