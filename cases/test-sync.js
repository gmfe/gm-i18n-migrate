import { t } from 'gm-i18n'
// const t = require('dsa')

const processTypeFilter = type => {
  switch (type) {
    case 1:
      return i18next.t('原料')
    case 2:
      return i18next.t('半成品')
    default:
      return ''
  }
}

const foo = () => {
  var s = t('无法')
  var oo = <>{t(/* tpl: 苏三说 */'行将就木')}</>
  console.log(s)
}

var twd = () => {
  var t = '发'
  console.log(t())
}
var s = () => {
  var sd = t(/* tpl: 只是测试 */'惹人爱')
  console.log('sa')
}
