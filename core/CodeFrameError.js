const { codeFrameColumns } = require('babel-code-frame');

class CodeFrameError extends Error {
    constructor(path, message) {
      const {node} = path;
      const rawCode = path.hub.file;
      const extraInfo = ``;
      if(node.loc){
        extraInfo = codeFrameColumns(rawCode, node.loc);
      }
      const errMessage = `${message}\n${extraInfo}`;
      super(errMessage);
    }
  }

  module.exports = CodeFrameError