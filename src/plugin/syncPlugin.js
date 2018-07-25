let util = require('../util')

function initVisitor(traverser) {
    return {
        CallExpression(path) {
            // 不是I8N
            if (!util.hasTransformedPath(path)) {
                return;
            }
            let keyPath = path.get('arguments')[0];
            if (keyPath.node.value == undefined) {
                util.warn('i18n函数key只能为StringLiteral', keyPath);
                return;
            }
            traverser.addKey(keyPath, keyPath.node.value);
        },
    }
}

module.exports = (traverser) => {
    return {
        visitor: initVisitor(traverser)
    }
}