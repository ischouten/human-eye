const path = require("node:path");
const Mocha = require("mocha");

function run() {
  const mocha = new Mocha({ color: true, ui: "tdd", timeout: 20_000 });
  mocha.addFile(path.resolve(__dirname, "extension.test.cjs"));
  return new Promise((resolve, reject) => {
    mocha.run(failures => (failures > 0 ? reject(new Error(`${failures} integration test(s) failed`)) : resolve()));
  });
}

module.exports = { run };
