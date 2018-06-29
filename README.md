
## 说明
一个使用`Babel`将已有项目迁移到`i18n`多语的工具。**Inspired By** [i18n-pick](https://github.com/ProtoTeam/i18n-pick)

主要功能有:
1. 扫描项目中的中文字符串，替换为类似`i18n.t(str)`的形式
2. 生成多语映射文件
3. 将后续新增的`i18n`信息同步到多语文件

## init
``` bash
git clone https://github.com/gmfe/gm-i18n-migrate

cd gm-i18n-migrate

npm install

npm link
```
## usage
``` bash
# 进入自己的项目
cd yourproject

# 处理指定路径文件 默认输出资源文件到out文件夹
i18n-m scan [paths] 

# 处理指定路径文件 会覆盖原有文件
i18n-m scan [paths] --rewrite

# 处理指定路径... --fixjsx尝试将类似如下JSXText hello {name} 作为整体处理
i18n-m scan [paths] --rewrite --fixjsx

# 扫描指定路径文件中的i18n信息 与资源文件同步(添加新增的key) 
i18n-m sync [paths] 

# 扫描指定路径文件中的i18n信息 与jsonpath中的语言文件同步并覆盖
i18n-m sync [paths] --jsonpath=./locales/cn/default.json

# 比较两个多语资源文件，将差异输出到新文件
i18n-m diff [paths] 

# 合并所有多语资源文件，合并后覆盖第一个路径的文件
i18n-m merge [paths] 

```
`i18n-m scan`主要用于项目的第一次迁移，`i18n-m sync`用于将后续开发时新增的`i18n.t`词条同步到多语文件中(**如果是插值情况需要自己去写模板**)，`i18n-m diff`和`i18n-m merge`用于 **多语文件** 之间(中英文)的操作。

## config
在项目根路径新建`i18n.config.js`,具体配置项可[查看](https://github.com/gmfe/gm-i18n-migrate/blob/master/src/config/index.js)。其中`exclude`遵循`glob`语法，例如`demo/**`。

## 一些问题
### 模板字符串
模板字符串中表达式存在`StringLiteral`类型时，可能不会转换。
``` javascript
let str = `批量上传${name === 'sku' ? '商品' : targetType.name}`
// 如上代码，商品不会转换
// let str = i18n.t('批量上传${VAR1}',{VAR1:name === 'sku' ? '商品' : targetType.name})
```
原因：使用`i18n.get`替换 **模板字符串** 后，`Babel`不会再遍历到之前的`StringLiteral`，理论上是应该遍历到的，具体原因有待研究。

解决：`scan`执行两次即可

### 符号处理
```javascript
    <span>&nbsp;你&nbsp;好&nbsp;</span>
```
考虑到`key`的语义，比如`保存`、`保 存`、`保&nbsp;存`、`保存：`实际上都是一个翻译，因此`key`的生成会去除这些情况(只针对`JSXText`和`JSXAttribute`类型)，特殊的场景需要自己手动处理。


### 注释
在将源字符串替换成`i18n.get`的形式后，会在后面加上注释说明原来的代码。但是有时因为有回车`\n`等空白符的问题，可能注释会附加不上，具体原因涉及到 [recast](https://github.com/benjamn/recast) 的`parser`和`printer`。


### JSX复杂情况
`JSX`会同时包含文本内容和标签，这样可能会导致语义上的一句话分散在多个标签或组件中，而要实现这样 **一整句话** 的替换会很困难或根本不可能。
```javascript
// examples

<div>本次下单金额为<Price>{money(all_price + sumOfToPay)}元</Price>，是否确认下单</div>

<div>当前站点下没有分类，请先去 <span onClick={this.handleAddCategory}>新建分类</span>，再新建商品</div> 
```
因此，针对`JSX`中的文本默认是单独处理的。如以上第二句话，最终替换如下。
``` javascript
<div>{i18next.t('当前站点下没有分类，请先去')} 
    <span onClick={this.handleAddCategory}>{i18next.t('新建分类')}</span>{i18next.t('，再新建商品')}
</div> 
```
当然，这种方案有时并不适用。
``` javascript
<div>
    你好，${name}。欢迎来到${where}  
</div> 
// 会替换成{i18next.t('你好，')}{name}{i18next.t('。欢迎来到')}{where}
// 我们可能想要的效果是：
// {i18next.t('KEY12',{VAR1:name,VAR2:where})}  //KEY12: 你好，${VAR1}。欢迎来到${VAR2}  
```
解决：先让代码回退到替换之前，然后用 `scan --fixjsx` 选项重新扫描一遍来修复。