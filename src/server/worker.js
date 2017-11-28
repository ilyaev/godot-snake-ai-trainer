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
                    brain: snake.scene.agent.toJSON()
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
    log('update spec ' + JSON.stringify(cmd))
    snake.scene.spec = cmd.value
    snake.scene.agent.epsilon = cmd.value.epsilon
    snake.scene.agent.alpha = cmd.value.alpha
    snake.scene.agent.gamma = cmd.value.gamma
    snake.scene.agent.experienceSize = cmd.value.experience_size
    snake.scene.agent.experienceAddEvery = cmd.value.learning_steps_per_iteration
}

let handshake = function(cmd) {
    id = cmd.id
}

let startLearning = function(cmd) {
    log('MODELS ' + modelName + ' - ' + cmd.modelName)
    if (cmd.modelName && cmd.modelName === modelName) {
        log('Already leraning model ' + cmd.modelName)
        return
    }
    modelName = cmd.modelName
    if (handler) {
        clearImmediate(handler)
    }
    snake = require('../common/snake-scene').instance({
        mode: 'server'
    })
    snake.initScene()
    snake.scene.spec = cmd.spec
    snake.scene.params = cmd.params
    snake.scene.actor = cmd.actor
    snake.scene.result = cmd.result
    snake.scene.agent.fromJSON(cmd.brain)
    snake.scene.agent.epsilon = cmd.spec.epsilon
    snake.scene.agent.alpha = cmd.spec.alpha
    snake.scene.agent.gamma = cmd.spec.gamma
    snake.scene.maxX = cmd.maxX
    snake.scene.maxY = cmd.maxY
    log('Learning Started - ' + snake.scene.agent.epsilon)
    run()
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
        brain: snake.scene.agent.toJSON()
    })
    setTimeout(() => process.exit(42), 1000)
}

ticker = setInterval(() => {
    send({ cmd: 'status', counter: counter, result: snake.scene.result, spec: snake.scene.spec })
}, 1000)
