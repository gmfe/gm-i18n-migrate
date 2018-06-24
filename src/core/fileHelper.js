const p = require('path');
const fs = require('fs-extra');
let config = require('../config')
const {
    resourceDir,
    outputDir
} = config;

const souceMapFileName = 'soucemap.json';
const langFileName = 'zh-cn.json';

class FileHelper {
    constructor() {
        this.basePath = process.cwd().split(/[\|/]/).slice(-1)[0].replace(/\\/g,'/');
    }
    formatTabs(filePath) {
        let rawCode = String(fs.readFileSync(filePath));
        rawCode = rawCode.replace(/\t/g, '    ');
        fs.outputFileSync(filePath, rawCode);
    }
    formatFilePath(filePath){
        return filePath.split(this.basePath)[1]
    }
    getTransformFilePath(filePath) {
        filePath = filePath.split(this.basePath)[1]
        return p.join(outputDir, filePath)
    }
    getSourceMapContent() {
        let path = this.getResourceFilePath(souceMapFileName);
        if (fs.existsSync(path)) {
            return fs.readJSONSync(path)
        }
        return ''
    }
    getResourceFilePath(filaname) {
        return p.join(resourceDir, filaname)
    }
    writeSourceMap(content) {
        this.writeResource(souceMapFileName, content)
    }
    writeLang(content) {
        this.writeResource(langFileName, content)
    }
    writeResource(filename, json) {
        let resourcePath = this.getResourceFilePath(filename);
        fs.outputJSONSync(resourcePath, json, {
            encoding: 'utf-8'
        });
    }
    write(filePath, content) {
        if (!config.rewrite) {
            filePath = this.getTransformFilePath(filePath)
        }
        fs.outputFileSync(filePath, content, {
            encoding: 'utf-8'
        });
    }
}

module.exports = new FileHelper();