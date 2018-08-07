let config = require('../config')
let util = require('../util')
const recast = require('recast')

const COMMENT_TYPE = {
    CommentBlock: true,
    CommentLine: true,
}

function disableSkip(disableDirectives) {
    let disableLines = {};
    let disableBlocks = [];
    let curDisableBlock = null;
    for (let directive of disableDirectives) {
        if (directive.type === 'disable') {
            curDisableBlock = {
                start: {
                    line: directive.line,
                    column: directive.column,
                }
            };
        } else if (directive.type === 'enable') {
            curDisableBlock.end = {
                line: directive.line,
                column: directive.column,
            }
            disableBlocks.push(curDisableBlock);
            curDisableBlock = null;
        } else if (directive.type === 'disable-next-line') {
            disableLines[directive.line + 1] = true
        } else if (directive.type === 'disable-line') {
            disableLines[directive.line] = true
        } else {
            util.error(`无法识别的i18n-scan标记${directive.type}`)
        }
    }

    return (node) => {
        let { loc } = node;
        if (loc == null) {
            /* JSXText 空白节点没有loc位置 */
            return false;
        }
        if (disableLines[loc.start.line]) {
            return true;
        }
        return disableBlocks.some((block) => {
            return loc.start.line > block.start.line && loc.end.line < block.end.line
        })
    }
}

function initVisitor(traverser) {
    let isDisabled = null;
    return {
        Program: {
            enter(path) {
                let disableDirectives = [];
                path.container.tokens
                    .filter((token) => {
                        return COMMENT_TYPE[token.type]
                    })
                    .forEach((comment) => {
                        let val = comment.value.trim();
                        let match = val.match(/^i18n-scan-(.+)$/)
                        if (match && match[1]) {
                            disableDirectives.push({
                                type: match[1],
                                line: comment.loc.start.line,
                                column: comment.loc.start.column,
                            })
                        }
                    })

                isDisabled = disableSkip(disableDirectives);
            },
            exit(path) { // 添加 import
                const imported = path.get("body")
                    .filter(p => p.isImportDeclaration())
                    .reduce((map, p) => {
                        map[p.getSource().trim()] = true;
                        return map;
                    }, {})
                let importDeclaration = util.parseStr(config.importStatementStr);
                // 已经引入了
                if (imported[config.importStatementStr.trim()]) {
                    return;
                }

                let output = recast.print(path.hub.file.ast).code;
                // 如果使用了i18n
                if (output.includes(config.callStatement)) {
                    path.unshiftContainer('body', importDeclaration);
                }

            }
        },
        StringLiteral(path) {
            if (isDisabled(path.node)) {
                return;
            }
            traverser.traverseNodePath(path);
        },
        TemplateLiteral(path) {
            if (isDisabled(path.node)) {
                return;
            }
            traverser.traverseNodePath(path);
        },
        JSXText(path) {
            if (isDisabled(path.node)) {
                return;
            }
            traverser.traverseJSXText(path)
        },
    }
}

module.exports = (traverser) => {
    return {
        visitor: initVisitor(traverser)
    }
}