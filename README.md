
## 说明
一个使用`Babel`将已有项目迁移到`i18n`多语的工具。**Inspired By** [i18n-pick](https://github.com/ProtoTeam/i18n-pick)

主要功能有:
1. 扫描项目中的中文字符串，替换为类似`i18n.t(str)`的形式
2. 生成多语映射文件
3. 将后续新增的`i18n`信息同步到多语文件

## init
``` bash
    npm gm-i18n-migrate -g
```
## usage
`i18n-m scan`主要用于项目的第一次迁移，`i18n-m sync`用于将后续开发时新增的`i18n.t`词条同步到多语文件中，`i18n-m pick-xlsx`和`i18n-m merge-xlsx`用于 **未翻译多语文件词条** 到 excel 文件的转换。

## config
在项目根路径新建`i18n.config.js`,具体配置项可[查看](https://github.com/gmfe/gm-i18n-migrate/blob/master/src/config/index.js)。其中`exclude`遵循`glob`语法，例如`demo/**`。

## CHANGELOG
### V2
V2版本主要由 gm_static_language 项目来调用该脚本，各个业务项目不再需要手动调用。
