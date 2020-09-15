const path = require('path')
const webpack = require('webpack')
let vtkRules = require('vtk.js/Utilities/config/dependency.js').webpack.core.rules;
const nodeExternals = require('webpack-node-externals')


module.exports = (env, argv) => {
  // const DIST_DIR = __dirname;
  const SERVER_PATH = (argv.mode === 'production') ?
    './src/server/server-prod.js' :
    './src/server/server-dev.js'
  const PUBLIC_PATH = (argv.mode === 'production') ? 'vis/' : '/'
  const DELIVER_PATH = (argv.mode === 'production') ? 'vis/dist' : 'dist'


return ({
    entry: {
      server: SERVER_PATH,
    },
    output: {
      path: path.join(__dirname, DELIVER_PATH),
      publicPath: '/',
      filename: '[name].js'
    },
    target: 'node',
    node: {
      // Need this when working with express, otherwise the build fails
      __dirname: false,   // if you don't put this is, __dirname
      __filename: false,  // and __filename return blank or /
        fs: "empty"
    },
    externals: [nodeExternals()], // Need this to avoid error when working with Express
    module: {
      rules: [
        {
          // Transpiles ES6-8 into ES5
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          }
        }
      //   {
      //     test: /\.svg$/,
      //     loader: 'svg-inline-loader'
      //  }
      ].concat(vtkRules)
    }
  })
}