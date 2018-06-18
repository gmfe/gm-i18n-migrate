const glob = require('glob');
const fs = require('fs-extra');
const p = require('path');
const visitor = require('./visitor')
let expressionTraverse = require('./core/ExpressionTraverse')
let log = console.log.bind(console);
let config = require('./config')

const {resourceDir,outputDir,exclude} = config;

/* 基本思路
// 源字符串
let s = `你好，${name}。欢迎来到${where}`

// name where这些变量名确定
let s = '你好，' + users[0].name + '。欢迎来到' + where.name

// 替换
let s = i18n.get('key#a',{name,where}) // 源字符串以注释形式显示   `你好，${name}。欢迎来到${where}` 

// 提供 keyStrategy 自定义key生成逻辑

// 可能还需要sourcemap，给出更详细的元信息

// 提取出的中文资源文件 
cnMap = {
    "key":{
        "a": "你好，{name}。欢迎来到 {where}!",
    }
}

// 复制一份 用来翻译
enMap = {
    "key#1": "Hello, {name}. Welcome to {where}!",
}
*/


function getOutputDir(filePath) {
    filePath = filePath.split(p.sep).slice(-2, -1);
    return p.join(outputDir, ...filePath)
}

function getTransformFilePath(filePath) {
    let filaname = filePath.split('/').slice(-1);
    return p.join(getOutputDir(filePath), ...filaname)
}

function getResourceFilePath(filaname){
    return p.join(resourceDir, filaname)
}


function write(filePath, content,type) {
    if(!type && !config.rewrite){
        filePath = getTransformFilePath(filePath)
    }
   
    fs.outputFileSync(filePath, content, {
        encoding: 'utf-8'
    });
}

function run(path) {
    glob(`${path}/**/*.{js,jsx}`, {
            ignore: exclude.map(pattern => `${path}/${pattern}`)
        },
        async (err, files) => {
            if (err) {
                throw err;
            }
            let start = Date.now();
            fs.removeSync(outputDir);

            files.forEach((filePath, i) => {
                if (filePath.includes('comp')) {
                    return;
                }

                const {
                    transform
                } = require('./core/transformer')
                const code = transform(filePath, scan)
                // 文件更新替换为 i18n.get 
                write(filePath, code);

            });
            // 资源文件
            let {
                resourceContent
            } = expressionTraverse;
            write(getResourceFilePath('cn.json'),resourceContent,'resource')
            let end = Date.now();
            let spend = ((end - start) / 1000).toFixed(2);
            log(`执行完毕！时间：${spend}s`)
        });
}

function scan({
    types: t
}) {
    return {
        visitor: {
            ...visitor
        }
    }
}


// 参考1
function scan2({
    types: t
}) {
    return {
        visitor: {
            JSXAttribute(path) {
                const {
                    node
                } = path;
                if (node.name.name !== 'defaultMessage' && path.node.value) {
                    detectChinese(node.value.value, path, 'jsx', 'JSXAttribute');
                }
            },
            JSXText(path) {
                const {
                    node
                } = path;
                detectChinese(node.value, path, 'jsx', 'JSXText');
            },
            JSXExpressionContainer(path) {
                const {
                    node
                } = path;
            },
            AssignmentExpression(path) {
                detectChinese(path.node.right.value, path, 'text', 'AssignmentExpression');
            },
            ObjectProperty(path) {
                detectChinese(path.node.value.value, path, 'text', 'ObjectProperty');
            },
            ArrayExpression(path) {
                path.node.elements.forEach(item => {
                    if (item.value) {
                        detectChinese(item.value, Object.assign({}, path, {
                            node: item
                        }), 'text', 'ArrayExpression');
                    }
                })
            },
            // 新增：new Person('小红')
            NewExpression(path) {
                path.node.arguments.forEach(item => {
                    detectChinese(item && item.value, path, 'text', 'NewExpression');
                });
            },
            // 新增：函数调用；cb('这是一个错误')
            CallExpression(path) {
                if (path.node.callee && path.node.callee.object) {
                    if (path.node.callee.object.name === 'console') {
                        return;
                    }
                    if (path.node.callee.object.name === 'React') {
                        return;
                    }
                }

                path.node.arguments.forEach(item => {
                    detectChinese(item && item.value, path, 'text', 'CallExpression');
                });
            },
            // 新增：case '这是中文'；switchStatement,
            SwitchCase(path) {
                if (path.node && path.node.test) {
                    detectChinese(path.node.test.value, path, 'text', 'SwitchCase');
                }
            }
        },

    }
}

// 参考2
function pick(babel) {
    const {
        types: t
    } = babel;
    const deal = {}

    function detectChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }

    function makeReplace(value) {
        return t.CallExpression(t.MemberExpression(t.Identifier("intl"), t.Identifier("get")), [
            t.StringLiteral(value)
        ]);
    }
    return {
        name: "youhua-transform", // not required
        visitor: {
            JSXText(path) {
                const {
                    node
                } = path;
                if (detectChinese(node.value)) {
                    path.replaceWith(
                        t.JSXExpressionContainer(makeReplace(node.value.trim().replace(/\n\s+/g, "\n")))
                    );
                }
            },
            StringLiteral(path) {
                const {
                    node
                } = path;
                const {
                    value
                } = node;
                if (detectChinese(value)) {
                    if (path.parent.type === "CallExpression") {
                        if (
                            path.parent.callee.type === "MemberExpression" &&
                            path.parent.callee.object.name === "intl"
                        ) {
                            return;
                        }
                        path.replaceWithSourceString(`intl.get('${value}')`);
                    }
                    if (path.parent.type === "JSXAttribute") {
                        path.replaceWith(t.JSXExpressionContainer(makeReplace(value.trim())));
                    } else {
                        path.replaceWithSourceString(`intl.get('${value}')`);
                    }
                }
            },
            TemplateLiteral(path) {
                const {
                    node
                } = path;
                if (!node.loc) {
                    return
                };
                const location = `${path.hub.file.log.filename}#${node.loc.start.line}#${node.loc.start.column}`;
                if (deal[location]) {
                    return
                }
                //const source = recast.print(path.node,{quote:'single'}).code.replace(/([\u4e00-\u9fa5]+)/g,"${intl.get('$1')}");
                //path.replaceWithSourceString(source);
                deal[location] = true;
            }
        }
    };
}


if (module === require.main) {
    run(p.join(__dirname, 'cases'));
}

module.exports = {
    run,
};
