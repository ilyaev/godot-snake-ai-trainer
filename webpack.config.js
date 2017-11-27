var debug = process.env.NODE_ENV !== 'production'
var webpack = require('webpack')
var path = require('path')

var DIST_DIR = path.resolve(__dirname, 'dist')
var SRC_DIR = path.resolve(__dirname, 'src')

module.exports = {
    context: __dirname,
    devtool: debug ? 'inline-sourcemap' : null,
    entry: SRC_DIR + '/client/index.js',
    output: {
        path: DIST_DIR + '/app',
        filename: 'bundle.js',
        publicPath: '/app/'
    },
    module: {
        loaders: [
            {
                test: /\.js?$/,
                include: SRC_DIR,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                query: {
                    presets: ['react', 'es2015', 'stage-0'],
                    plugins: ['react-html-attrs', 'transform-class-properties', 'transform-decorators-legacy']
                }
            }
        ]
    },
    plugins: debug
        ? []
        : [
              new webpack.optimize.DedupePlugin(),
              new webpack.optimize.OccurenceOrderPlugin(),
              new webpack.HotModuleReplacementPlugin()
              //   new webpack.optimize.UglifyJsPlugin({
              //       mangle: false,
              //       sourcemap: false
              //   })
          ]
}
