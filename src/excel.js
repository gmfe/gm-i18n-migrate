const XLSX = require('xlsx')
const fs = require('fs-extra')
const XLSX_NAME = 'output.xlsx';
const JSON_NAME = 'output.json';
const header = ['中文', '英文']

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
function xlsx2json(xlsxPath, options) {
    let wb = XLSX.readFile(xlsxPath);
    const sheetNames = wb.SheetNames;
    let xlsxJSON = XLSX.utils.sheet_to_json(wb.Sheets[sheetNames[0]]);
    let json = xlsxJSON.reduce((accm, item) => {
        let key = item[header[0]];
        let val = item[header[1]];
        accm[key] = val;
        return accm;
    }, {})
    fs.writeJSONSync(options.out || JSON_NAME, json);
}


module.exports = {
    json2xlsx, xlsx2json
}