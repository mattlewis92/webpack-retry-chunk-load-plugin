const path = require('path');
const webpack = require('./utils/webpack');

const mainOutputFile = path.join(__dirname, 'fixtures', 'dist', 'main.js');

test('override the default jsonp script', async () => {
  const { result, fs } = webpack();
  await result;
  const mainContents = fs.readFileSync(mainOutputFile).toString();
  expect(mainContents).toMatchSnapshot();
});

test('override the default jsonp script without retry', async () => {
  const { result, fs } = webpack({ chunks: [] });
  await result;
  const mainContents = fs.readFileSync(mainOutputFile).toString();
  expect(mainContents).toMatchSnapshot();
});

test('retry loading the main chunk', async () => {
  const { result, fs } = webpack({ chunks: ['main'] });
  await result;
  const mainContents = fs.readFileSync(mainOutputFile).toString();
  expect(mainContents).toMatchSnapshot();
});
