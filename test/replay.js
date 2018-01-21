var fs = require('fs')
var dotenv = require('dotenv')
var getCollection = require('../export').getCollection
var exec = require('child_process').exec

var snake = false

dotenv.load()

var handler = false
var counter = 0
var tick = 1000
var tickInterval = 2
var glEpoch = 0
var paused = false

const pathToReplay = process.env.PATH_TO_REPLAY || './'

const getSnake = model => {
    var snake = require('../src/common/snake-scene').instance({
        mode: 'client',
        test: true,
        recording: true,
        onEpoch: (epoch, replay) => {
            fs.writeFileSync(pathToReplay + 'replay.m8x8', replay.join('\r\n'))
            paused = true
            setTimeout(() => {
                paused = false
            }, 1000)
        }
    })

    var cmd = {
        spec: model.spec,
        params: model.params,
        maxX: model.params.maxX,
        maxY: model.params.maxY,
        level: model.params.homelevel,
        start: false,
        brain: null,
        actor: null
    }

    snake.initScene()

    snake.scene.modelName = 'TEST8x8'
    snake.scene.spec = cmd.spec
    snake.scene.spec.size = 7
    snake.scene.params = cmd.params
    snake.scene.agent.epsilon = cmd.spec.epsilon
    snake.scene.agent.alpha = cmd.spec.alpha
    snake.scene.agent.gamma = cmd.spec.gamma
    snake.scene.maxX = cmd.maxX
    snake.scene.maxY = cmd.maxY
    snake.scene.spec.rivals = 0
    snake.loadLevel(cmd.params.homelevel || 'empty8x8')
    snake.implantBrain(model.brain)

    return snake
}

const runPlayer = () => {
    const cmd = 'python ' + pathToReplay + 'play.py SERVER'
    console.log('EXEC: ' + cmd, { cwd: pathToReplay })
    exec(cmd)
}

var run = function() {
    if (snake && !paused) {
        counter++
        snake.nextStep()
        handler = setImmediate(run)
    } else {
        setTimeout(() => {
            handler = setImmediate(run)
        }, 900)
    }
}

const runModel = model => {
    console.log('Run Model: ' + model.name)
    snake = getSnake(model)
    runPlayer()
}

getCollection().then(collection => {
    collection
        .find({}, {})
        .toArray()
        .then(data => {
            data.map(record => {
                const model = JSON.parse(record.model)
                if (model.params.homelevel === 'empty8x8') {
                    runModel(model)
                }
            })
            collection.db.close()
        })
})

run()
