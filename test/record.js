var fs = require('fs')
var dotenv = require('dotenv')
dotenv.load()
var exec = require('child_process').exec

const pathToReplay = process.env.PATH_TO_REPLAY || './'

const runPlayer = () => {
    const cmd = 'ps | grep "play.py SERVER"'
    exec(cmd, (error, out, err) => {
        if (!error) {
            out
                .split('\n')
                .filter(one => one.indexOf('grep') === -1 && one.trim())
                .map(one => one.split(' ')[0])
                .forEach(pid => {
                    console.log('KILL: ' + pid)
                    exec('kill ' + pid)
                })
            setTimeout(() => {
                const cmd = 'python ' + pathToReplay + 'play.py SERVER'
                console.log('EXEC: ' + cmd, { cwd: pathToReplay })
                exec(cmd)
            }, 500)
        }
    })
}

runPlayer()

var snake = require('../src/common/snake-scene').instance({
    mode: 'server',
    test: true,
    recording: true,
    onEpoch: (epoch, replay) => {
        if (epoch % 10 === 0) {
            fs.writeFileSync(pathToReplay + 'replay.m8x8', replay.join('\r\n'))
        }
    }
})

var features = [snake.inputs.FEATURE_CLOSEST_FOOD_DICRECTION, snake.inputs.FEATURE_FULL_MAP_6]

var handler = false
var counter = 0
var cmd = {
    spec: {
        alpha: 0.02,
        epsilon: 0.1,
        numHiddenUnits: 100,
        gamma: 0.75,
        rivals: 0,
        size: 7
    },
    params: {
        numStates: snake.calculateMaxNumInputs(features),
        numActions: 4,
        maxX: 7,
        maxY: 7,
        homelevel: 'empty8x8',
        features: features
    },
    maxX: 7,
    maxY: 7,
    level: 'empty8x8',
    start: true,
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
snake.resizeTo(snake.scene.spec.size, snake.scene.spec.size)
snake.scene.spec.rivals = 0
snake.loadLevel(cmd.params.homelevel || 'empty8x8')

var run = function() {
    counter++
    snake.nextStep()
    handler = setImmediate(run)
}

if (cmd.start) {
    console.log('Learning Started - ' + snake.scene.agent.epsilon)
    run()
}
