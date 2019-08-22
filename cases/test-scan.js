import { t } from 'gm-i18n'
// const t = require('dsa')

const processTypeFilter = type => {
  switch (type) {
    case 1:
      return '原料'
    case 2:
      return i18next.t('半成品')
    default:
      return ''
  }
}

const foo = () => {
  var s = t('无法')
  var oo = <>中国</>
  console.log(s)
}

var twd = () => {
  var t = '发'
  console.log(t())
}
var s = () => {
  var sd = `无法啥${'大的士费'}`
  console.log('sa')
}
