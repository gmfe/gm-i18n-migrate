let expressionTraverse = require('../core/ExpressionTraverse')
let config = require('../config')
let util = require('../core/util')

// 通过 traverse 找到最顶层的表达式
let dynamicVisitor = {
    Program(path) { // 添加 import
        const imported = path.get("body")
        .filter(p => p.isImportDeclaration())
        .reduce((map,p)=>{
            map[p.getSource().trim()] = true;
            return map;
        },{})
        // 
        if(imported[config.importStatementStr]){
            return;
        }

        let importDeclaration = util.parseStr(config.importStatementStr);
        path.unshiftContainer('body', importDeclaration);
      },
    StringLiteral(path){
        // 已经是I8N
       if(util.hasTransformed(path)){
           return;
       }
       // 导入语句
       if(path.parent.type === 'ImportDeclaration'){
           return;
       }
        expressionTraverse.traverse(path);
    },
    TemplateLiteral(path){
        expressionTraverse.traverse(path);
    }
}

module.exports = dynamicVisitor