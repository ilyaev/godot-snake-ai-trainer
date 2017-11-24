var path = require('path')
var express = require('express')
var app = express()
var PORT = process.env.PORT || 8080
var server = require('http').createServer(app)
var io = require('socket.io').listen(server)
var DQNAgent = require('reinforcenode').DQNAgent

var actions = [
    {
        dx: 0,
        dy: 1
    },
    {
        dx: 0,
        dy: -1
    },
    {
        dx: 1,
        dy: 0
    },
    {
        dx: -1,
        dy: 0
    }
]

if (process.env.NODE_ENV !== 'production') {
    var webpackDevMiddleware = require('webpack-dev-middleware')
    var webpackHotMiddleware = require('webpack-hot-middleware')
    var webpack = require('webpack')
    var config = require('../../webpack.config')
    var compiler = webpack(config)

    app.use(webpackDevMiddleware(compiler, { noInfo: true, publicPath: config.output.publicPath }))
    app.use(webpackHotMiddleware(compiler))
}

console.log('PATH', path.join(__dirname, '../../dist'))

app.use(express.static(path.join(__dirname, '../../dist')))

app.get('/service', function(request, response) {
    response.json({
        a: 444,
        agent: agent.act([0.5, 0.5])
    })
})

//app.list
server.listen(PORT, function(error) {
    if (error) {
        console.error(error)
    } else {
        console.info('==> \t Listening on port %s. Visit http://localhost:%s in your browser', PORT, PORT)
    }
})

var scene = {
    agent: false,
    timeScale: 1,
    maxX: 0,
    maxY: 0,
    target: {
        x: 0,
        y: 0
    },
    actor: {
        x: 0,
        y: 0
    },
    result: {
        step: 0,
        wins: 0
    },
    reward: 0,
    interval: false
}

var runLearning = scene => {
    return () => {
        for (var i = 0; i < scene.timeScale; i++) {
            var state = [
                scene.actor.x / scene.maxX,
                scene.actor.y / scene.maxY,
                (scene.target.x - scene.actor.x) / scene.maxX,
                (scene.target.y - scene.actor.y) / scene.maxY
            ]
            var action = scene.agent.act(state)
            var act = actions[action]

            scene.actor.x = scene.actor.x + act.dx
            scene.actor.y = scene.actor.y + act.dy
            scene.actor.step += 1

            if (scene.actor.x == scene.target.x && scene.actor.y == scene.target.y) {
                scene.agent.learn(1)
                scene = restartActor(scene, 1)
                scene.result.wins++
            } else if (scene.actor.x < 0 || scene.actor.y < 0 || scene.actor.x > scene.maxX || scene.actor.y > scene.maxY) {
                scene.agent.learn(-1)
                scene = restartActor(scene, -1)
            } else {
                //scene.agent.learn(scene.maxX + scene.maxY - Math.abs(scene.actor.x - scene.target.x) - Math.abs(scene.actor.y - scene.target.y))
                scene.agent.learn(0)
            }
            scene.result.step++
        }
    }
}

var restartActor = (scene, reward) => {
    if (reward > 0) {
        scene.target.x = Math.round(Math.random() * scene.maxX)
        scene.target.y = Math.round(Math.random() * scene.maxY)
    }
    scene.actor.x = 0
    scene.actor.y = 0
    scene.actor.step = 0
    return scene
}

var initGame = cmd => {
    if (scene.interval) {
        clearInterval(scene.interval)
    }
    scene.agent = new DQNAgent(
        {
            getNumStates: function() {
                return 4
            },
            getMaxNumActions: function() {
                return 4
            }
        },
        cmd.spec
    )
    scene.result = {
        step: 0,
        wins: 0
    }
    scene.reward = 0
    scene.maxX = cmd.maxX
    scene.maxY = cmd.maxY
    scene.target = cmd.target
    scene.actor.x = 0
    scene.actor.y = 0
    scene.timeScale = 100
    scene.interval = setInterval(runLearning(scene), 10)
}

var sendStatus = () => {
    io.sockets.emit(
        'response',
        JSON.stringify({
            code: 'STATUS',
            result: scene.result,
            actor: scene.actor,
            target: scene.target,
            brain: scene.agent.toJSON()
        })
    )
}

io.sockets.on('connection', function(socket) {
    socket.on('command', function(data) {
        var cmd = {}

        try {
            cmd = JSON.parse(data)
            if (cmd.cmd === 'START') {
                initGame(cmd)
            } else if (cmd.cmd === 'STATUS') {
                sendStatus()
            }
        } catch (e) {
            io.sockets.emit('error', 'Invalid command')
        }
    })
})

//setInterval(function() {}, 0)
