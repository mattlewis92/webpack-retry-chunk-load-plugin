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

test('retry loading the main chunk with retryDelay', async () => {
  const { result, fs } = webpack({ chunks: ['main'], retryDelay: 3000 });
  await result;
  const mainContents = fs.readFileSync(mainOutputFile).toString();
  expect(mainContents).toMatchSnapshot();
});

test('inserts last resort script into the code handling failure after all retries', async () => {
  const { result, fs } = webpack({
    chunks: ['main'],
    lastResortScript: "window.location.href='/500.html'",
  });
  await result;
  const mainContents = fs.readFileSync(mainOutputFile).toString();
  expect(mainContents).toMatchSnapshot();
});
