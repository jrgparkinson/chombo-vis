import path from 'path'
import express from 'express'

const app = express(),
            DIST_DIR = __dirname,
            HTML_FILE = path.join(DIST_DIR, 'index.html'),
            PROD_PATH = '/vis'  // this is where we serve from, e.g. http://website.com/vis/ is our home page

app.use(express.static(DIST_DIR))
app.use(PROD_PATH, express.static('static'))

app.get(PROD_PATH + '/datafiles', (req, res, next) => {

    const { readdirSync, statSync } = require('fs')
    const { join } = require('path')
  
    const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
  
    // Check files are of the correct format
    let data_dirs = [];
    dirs('./static/data/').forEach(function(folder){
  
      let sub_dirs = readdirSync(path.join('./static/data/', folder))
      if (sub_dirs.includes('metadata.json') && sub_dirs.includes('fields.vti'))
      {
        data_dirs.push(folder);
      }
    })
    res.json(data_dirs)
    res.end()
  });


app.get('*', (req, res) => {
    console.log('PROD server');
    res.sendFile(HTML_FILE)
})



const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`App listening to ${PORT}....`)
    console.log('Press Ctrl+C to quit.')
})