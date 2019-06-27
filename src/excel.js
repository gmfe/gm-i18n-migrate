const XLSX = require('xlsx')
const xlsxStyle = require('xlsx-style')
const fs = require('fs-extra')
const XLSX_NAME = '未翻译.xlsx'
const util = require('./util')
const p = require('path')
const fileHelper = require('./core/fileHelper')

const header = ['ID', '中文词条', '译文']
const tips = [
  ['注：在「译文」列参考「中文词条」填入翻译(ID列不要动)，其中${num}这样的符号表示变量，翻译的时候可根据语序移动位置，保持原有的格式就行'], // eslint-disable-line
  ['例如：词条「推迟${num}天」 翻译成英文 「delay ${num} day(s)」'] // eslint-disable-line
]
function jsonContent2Xlsx (json, options) {
  let arrays = [
    ...tips,
    header
  ]
  let cnJSON = fileHelper.getCnJSON()
  Object.entries(json)
    .forEach(([key, value]) => {
      let chinese = value
      // 已经翻译过的词条找到对应的中文原文
      if (!util.hasChinese(chinese)) {
        if (cnJSON[key]) {
          // 动态的在cnjson中
          chinese = cnJSON[key]
        } else {
          chinese = key
        }
      }
      if (key === value) {
        key = ''
      }
      arrays.push([key, chinese, ''])
    })

  let ws = XLSX.utils.aoa_to_sheet(arrays)
  tips.forEach((item, index) => {
    ws[`A${index + 1}`].s = {
      font: {
        sz: 18,
        color: {
          rgb: 'FF0000'
        }
      }
    }
  })

  ws['!merges'] = [
    {
      s: {// s为开始
        c: 0, // 开始列
        r: 0// 可以看成开始行,实际是取值范围
      },
      e: {// e结束
        c: 2, // 结束列
        r: 0// 结束行
      }
    },
    {
      s: {// s为开始
        c: 0, // 开始列
        r: 1 // 可以看成开始行,实际是取值范围
      },
      e: {// e结束
        c: 2, // 结束列
        r: 1 // 结束行
      }
    }
  ]
  let wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  xlsxStyle.writeFile(wb, XLSX_NAME)
  util.log(`输出xlsx文件 ${XLSX_NAME}`)
}
function json2xlsx (jsonPath, options) {
  const json = fs.readJSONSync(jsonPath)
  jsonContent2Xlsx(json, options)
}
function xlsx2JSONAdapter (xlsxJSON) {
  return xlsxJSON.reduce((accm, item) => {
    let key = item[header[1]]
    let id = item[header[0]] || key // 没有则取 key
    let val = item[header[2]]
    if (val == null || val === '') {
      // 没翻译
      return accm
    }
    accm[id] = val
    return accm
  }, {})
}

function xlsx2JsonContent (xlsxPath) {
  let wb = XLSX.readFile(xlsxPath)
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const range = sheet['!ref'].replace('A1', `A${tips.length + 1}`)
  // !ref:"A1:D185"
  let xlsxJSON = xlsxStyle.utils.sheet_to_json(sheet, { range })
  let json = xlsx2JSONAdapter(xlsxJSON)
  return json
}
function xlsx2json (xlsxPath, options) {
  let json = xlsx2JsonContent(xlsxPath)
  let output = `${p.resolve(process.cwd(), 'default')}.json`
  fs.outputJSONSync(output, json)
  util.log(`输出json文件 ${output}`)
}

module.exports = {
  json2xlsx, xlsx2json, xlsx2JsonContent, jsonContent2Xlsx
}
