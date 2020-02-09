const path = require('path');
const express = require('express');

const app = express();
const port = 3000;

app.get('/0.js', (req, res, next) => {
  if (
    req.query['cache-bust'] === 'true' &&
    req.query['retry-attempt'] === '5'
  ) {
    next();
  } else {
    res.status(500).send('fail');
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
