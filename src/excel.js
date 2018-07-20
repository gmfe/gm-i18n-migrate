const XLSX = require('xlsx')
const fs = require('fs-extra')
const XLSX_NAME = 'output.xlsx';
const util = require('./util');
const p = require('path');
const header = ['中文名', '英文名']

function json2xlsx(jsonPath, options) {
    const json = fs.readJSONSync(jsonPath)
    let xlsxJSON = Object.entries(json)
        .reduce((accm, [key, value]) => {
            accm.push({ [header[0]]: key, [header[1]]: value });
            return accm;
        }, []);
    let ws = XLSX.utils.json_to_sheet(xlsxJSON);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, options.out || XLSX_NAME);
}
function xlsxJSONAdapter(xlsxJSON){
    return xlsxJSON.reduce((accm, item) => {
        let key = item[header[0]];
        let val = item[header[1]];
        if(key == undefined || val == undefined){
            // 没翻译
            return accm;
        }
        accm[key] = val;
        return accm;
    }, {})
}
function xlsx2json(xlsxPath, options) {
    let wb = XLSX.readFile(xlsxPath);
    const sheetNames = wb.SheetNames;
    for(let sheetName of sheetNames){
        let xlsxJSON = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        let json = xlsxJSONAdapter(xlsxJSON)
        let output = `${p.resolve(process.cwd(),sheetName)}.json`;
        fs.writeJSONSync(output, json);
        util.log(`输出json文件 ${output}`)
    }
    
}


module.exports = {
    json2xlsx, xlsx2json
}