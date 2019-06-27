const OpenCC = require('opencc')
const instance = new OpenCC('s2hk.json')
module.exports = (text) => instance.convertSync(text)
