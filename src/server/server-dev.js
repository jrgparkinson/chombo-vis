import path from 'path'
import express from 'express'
import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpackHotMiddleware from 'webpack-hot-middleware'
import config from '../../webpack.dev.config.js'

const app = express(),
            DIST_DIR = __dirname,
            HTML_FILE = path.join(DIST_DIR, 'index.html'),
            compiler = webpack(config)
            
app.use(webpackDevMiddleware(compiler, {
  publicPath: config.output.publicPath
}))

app.use(express.static('static'))

app.use(webpackHotMiddleware(compiler))

app.get('/datafiles', (req, res, next) => {

  const { readdirSync, statSync } = require('fs')
  const { join } = require('path')

  const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())

  // Check files are of the correct format
  var data_dirs = [];
  dirs('./static/data/').forEach(function(folder){

    var sub_dirs = readdirSync(path.join('./static/data/', folder))
    if (sub_dirs.includes('metadata.json') && sub_dirs.includes('fields.vti'))
    {
      data_dirs.push(folder);
    }
  })
  res.json(data_dirs)
  res.end()

});

app.get('*', (req, res, next) => {

  var filename = path.join(compiler.outputPath,'index.html');
  compiler.outputFileSystem.readFile(filename, (err, result) => {
  if (err) {
    return next(err)
  }
  res.set('content-type', 'text/html')
  res.send(result)
  res.end()
  })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`App listening to ${PORT}....`)
    console.log('Press Ctrl+C to quit.')
})