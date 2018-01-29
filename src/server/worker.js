let snake
let modelName = ''
let counter = 0
let handler
let ticker
let id = 0

let send = obj => {
    process.send(JSON.stringify(obj))
}

let log = txt => {
    console.log('WORKER ' + id + ': ' + txt)
}

let lastEpoch = 0

const levels = require('../common/levels')
    .levels.map(one => one.name)
    .filter(one => one !== 'empty8x8' && one !== 'empty16x16')
console.log('ALL LEVELS - ', levels)

process.on('message', msg => {
    let cmd = {}

    try {
        cmd = JSON.parse(msg)
    } catch (e) {
        cmd = {
            cmd: 'undefined'
        }
    }

    const code = cmd.cmd || 'null'

    switch (code) {
        case 'finish':
            finishLearning(cmd)
            break
        case 'learn':
            startLearning(cmd)
            break
        case 'HANDSHAKE':
            handshake(cmd)
            break
        case 'spec':
            updateSpec(cmd)
            break
        case 'sync':
            if (snake) {
                send({
                    cmd: 'sync',
                    save: false,
                    brain: snake.scene.agent.toJSON(),
                    name: snake.scene.modelName
                })
            }
            break
        default:
            send({
                cmd: 'Invalid Command: ' + JSON.stringify(msg)
            })
    }
})

let updateSpec = function(cmd) {
    log('update spec for ' + modelName + ' / ' + JSON.stringify(cmd))
    console.log('params', snake.scene.params)
    snake.scene.spec = cmd.value
    snake.scene.agent.epsilon = cmd.value.epsilon
    snake.scene.agent.alpha = cmd.value.alpha
    snake.scene.agent.gamma = cmd.value.gamma
    snake.scene.agent.experienceSize = cmd.value.experience_size
    snake.scene.agent.experienceAddEvery = cmd.value.learning_steps_per_iteration
    if (cmd.value.level && cmd.value.level !== snake.scene.params.homelevel) {
        snake.scene.params.homelevel = cmd.value.level
        if (handler) {
            clearImmediate(handler)
            setTimeout(() => {
                console.log('-Change Level To: ', snake.scene.params.homelevel)
                snake.loadLevel(snake.scene.params.homelevel || 'empty8x8')
                run()
            }, 100)
        } else {
            snake.loadLevel(snake.scene.params.homelevel || 'empty8x8')
        }
    }
}

let handshake = function(cmd) {
    id = cmd.id
}

let startLearning = function(cmd) {
    log('MODELS ' + modelName + ' - ' + cmd.modelName)
    if (cmd.modelName && cmd.modelName === modelName) {
        log('Already learning model ' + cmd.modelName)
        return
    }
    modelName = cmd.modelName
    if (handler) {
        clearImmediate(handler)
    }
    snake = require('../common/snake-scene').instance({
        mode: 'server',
        onEpoch: () => {
            processRotation()
        }
    })
    snake.initScene()
    snake.scene.modelName = modelName
    snake.scene.spec = cmd.spec
    if (!snake.scene.spec.size) {
        snake.scene.spec.size = 7
    }
    snake.scene.params = cmd.params
    snake.scene.actor = cmd.actor
    snake.scene.result = cmd.result
    snake.implantBrain(cmd.brain)
    snake.scene.agent.epsilon = cmd.spec.epsilon
    snake.scene.agent.alpha = cmd.spec.alpha
    snake.scene.agent.gamma = cmd.spec.gamma
    snake.scene.maxX = cmd.maxX
    snake.scene.maxY = cmd.maxY
    snake.resizeTo(snake.scene.spec.size, snake.scene.spec.size)
    snake.scene.spec.rivals = (Math.floor(snake.scene.spec.size / 7) - 1) * 2
    snake.loadLevel(snake.scene.params.homelevel || 'empty8x8')
    if (cmd.start) {
        log('Learning Started - ' + snake.scene.agent.epsilon)
        run()
    }
    curSpec = snake.scene.spec
}

let run = function() {
    counter++
    snake.nextStep()
    handler = setImmediate(run)
}

let finishLearning = function(cmd) {
    log('Learning Finished')
    if (handler) {
        clearImmediate(handler)
    }
    if (ticker) {
        clearTimeout(ticker)
    }
    send({
        cmd: 'sync',
        save: true,
        brain: snake.scene.agent.toJSON(),
        name: snake.scene.modelName
    })
    setTimeout(() => process.exit(42), 1000)
}

const processRotation = () => {
    if (snake.scene.spec.rotation && snake.scene.spec.rotation > 0 && snake.scene.result.epoch - lastEpoch > snake.scene.spec.rotation) {
        lastEpoch = snake.scene.result.epoch
        snake.loadLevel(levels[Math.floor(Math.random() * levels.length)])
        snake.restartActor(-1, 'restart')
        send({
            cmd: 'sync',
            save: true,
            brain: snake.scene.agent.toJSON(),
            name: snake.scene.modelName,
            level: snake.scene.level.name
        })
        return true
    }
    return false
}

ticker = setInterval(() => {
    send({
        cmd: 'status',
        counter: counter,
        name: snake.scene.modelName,
        result: snake.scene.result,
        spec: snake.scene.spec
    })
    send({
        cmd: 'brain',
        name: snake.scene.modelName,
        brain: snake.scene.agent.toJSON()
    })
    if (handler) {
    }
}, 1000)
