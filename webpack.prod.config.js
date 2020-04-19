const path = require("path")
var vtkRules = require('vtk.js/Utilities/config/dependency.js').webpack.core.rules;

const HtmlWebPackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const TerserPlugin = require('terser-webpack-plugin');
const { BaseHrefWebpackPlugin } = require('base-href-webpack-plugin');
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
module.exports = {
  entry: {
    main: './src/index.js'
  },
  output: {
    path: path.join(__dirname, 'vis'),
    publicPath: '/', //  '/vis/',
    filename: '[name].js'
  },
  target: 'web',
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [ // new TerserPlugin({ parallel: 1 }), // turn this off - runs out of memory on prod
                new OptimizeCSSAssetsPlugin({})]
    // splitChunks: { chunks: 'all',  }
  },
  module: {
    rules: [
      {
        // Transpiles ES6-8 into ES5
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        // Loads the javacript into html template provided.
        // Entry point is set below in HtmlWebPackPlugin in Plugins 
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
            options: { minimize: true }
          }
        ],
        exclude: /index\.html$/
      },
      {
        // Loads svg images in the same way
        test: /\.svg$/,
        // use: [{loader: "url-loader"}]
        use: 'file-loader'
      },
      {
        // Loads CSS into a file when you import it via Javascript
        // Rules are set in MiniCssExtractPlugin
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
    ].concat(vtkRules)
  },
  plugins: [
    new HtmlWebPackPlugin(),
    new HtmlWebPackPlugin({
      template: "./src/html/index.html",
      filename: "./index.html",
    }),
    new BaseHrefWebpackPlugin({ baseHref: '/vis/' }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ]
}