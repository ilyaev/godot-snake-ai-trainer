var dotenv = require('dotenv')
var path = require('path')
var express = require('express')
var app = express()
dotenv.load()
var PORT = process.env.PORT || 8080
var server = require('http').createServer(app)
var io = require('socket.io').listen(server)
var protocol = require('./protocol')(io)

if (process.env.NODE_ENV !== 'production') {
    var webpackDevMiddleware = require('webpack-dev-middleware')
    var webpackHotMiddleware = require('webpack-hot-middleware')
    var webpack = require('webpack')
    var config = require('../../webpack.config')
    var compiler = webpack(config)

    app.use(webpackDevMiddleware(compiler, { quiet: true, noInfo: true, publicPath: config.output.publicPath }))
    app.use(webpackHotMiddleware(compiler))
}

app.use(express.static(path.join(__dirname, '../../dist')))

app.get('/service', function(request, response) {
    response.json({
        success: true
    })
})

server.listen(PORT, function(error) {
    if (error) {
        console.error(error)
    } else {
        console.info('==> \t Listening on port %s. Visit http://[SERVER_NAME]:%s in your browser', PORT, PORT)
    }
})

protocol.initialize()
