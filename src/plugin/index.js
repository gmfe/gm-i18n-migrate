

let expressionTraverse = require('../core/ExpressionTraverse')
let config = require('../config')
let util = require('../core/util')
const recast = require('recast')

const EXCLUDE_TYPE = {
    ImportDeclaration:true, // import语句中的字符串
    MemberExpression:true, // 类似user['name']
}
function shouldExclude(path){
    let type = path.parent.type
    switch(type){
        case 'NewExpression': 
        if(path.parent.callee.name === 'RegExp'){ // 正则跳过
            return true;
        }
        break;
    }
    return !!EXCLUDE_TYPE[type];
}

// 通过 traverse 找到最顶层的表达式
let visitor = {
    Program:{
        exit(path) { // 添加 import
            const imported = path.get("body")
            .filter(p => p.isImportDeclaration())
            .reduce((map,p)=>{
                map[p.getSource().trim()] = true;
                return map;
            },{})
            if(imported[config.importStatementStr.trim()]){
                return;
            }

            let output = recast.print(path.hub.file.ast).code;
            // 如果使用了i18n
            if(output.includes(config.callStatement)){
                let importDeclaration = util.parseStr(config.importStatementStr);
                path.unshiftContainer('body', importDeclaration);
            }
           
          }
    },
    StringLiteral(path){
        // 已经是I8N
       if(util.hasTransformed(path)){
           return;
       }
       // 特殊的语句
       if(shouldExclude(path)){
           return;
       }
      
        expressionTraverse.traverse(path);
    },
    TemplateLiteral(path){
        expressionTraverse.traverse(path);
    },
    JSXText(path) {
        // 尝试解析多个
        if(config.jsxtext){
            expressionTraverse.traverseJSXText(path)
        }else{
            // JSXText 目前就直接替换
            expressionTraverse.traverseByRoot(path);
        }
    },
    
}

module.exports = () => ({
  visitor
})