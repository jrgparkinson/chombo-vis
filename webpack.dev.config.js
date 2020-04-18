const path = require('path')
const webpack = require('webpack')
let vtkRules = require('vtk.js/Utilities/config/dependency.js').webpack.core.rules;

const HtmlWebPackPlugin = require('html-webpack-plugin')
const { BaseHrefWebpackPlugin } = require('base-href-webpack-plugin');

module.exports = {
  entry: {
    main: ['webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000', './src/index.js']
  },
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name].js'
  },
  mode: 'development',
  target: 'web',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        // Loads the javacript into html template provided.
        // Entry point is set below in HtmlWebPackPlugin in Plugins 
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
            // options : {url : false } // don't resolve urls - allows relative imports
            //options: { minimize: true }
          }
        ]       
        // exclude: /index\.html$/
      },
      { 
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      {
       test: /\.(png|svg|jpg|gif)$/,
       use: 'file-loader'
      }
    ].concat(vtkRules)
  },
  // resolve: {
  //   alias:{
  //       "~img": path.resolve("./img")
  //   },
  //   extensions: [ '.svg', '.jpg' ]
  // },
  plugins: [
    new HtmlWebPackPlugin(),
    new HtmlWebPackPlugin({
      template: "./src/html/index.html",
      filename: "./index.html",
      excludeChunks: [ 'server' ]
    }),
    new BaseHrefWebpackPlugin({ baseHref: '/' }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
  ],
  devServer: {
    historyApiFallback: true // <-- this needs to be set to true
}
}