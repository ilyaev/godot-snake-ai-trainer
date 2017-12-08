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

let curRule = {
    id: 0
}

let lastEpoch = 0

const curriculum = [
    {
        epoch: 1000,
        id: 1,
        level: 'level1',
        epsilon: 0.5
    },
    {
        epoch: 2000,
        id: 2,
        epsilon: 0.4
    },
    {
        epoch: 3000,
        id: 3,
        epsilon: 0.3
    },
    {
        epoch: 4000,
        id: 4,
        epsilon: 0.2
    },
    {
        epoch: 5000,
        id: 5,
        epsilon: 0.1
    },
    {
        epoch: 10000,
        id: 6,
        epsilon: 0.002
    },
    {
        id: 7,
        epoch: 15000,
        level: 'level2',
        epsilon: 0.1
    },
    {
        id: 8,
        epoch: 16000,
        epsilon: 0.002
    },
    {
        id: 9,
        epoch: 25000,
        level: 'level3',
        epsilon: 0.1
    },
    {
        id: 10,
        epoch: 26000,
        epsilon: 0.02
    }
]

const levels = curriculum.filter(one => one.level).map(one => one.level)
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
    snake.scene.spec = cmd.value
    snake.scene.agent.epsilon = cmd.value.epsilon
    snake.scene.agent.alpha = cmd.value.alpha
    snake.scene.agent.gamma = cmd.value.gamma
    snake.scene.agent.experienceSize = cmd.value.experience_size
    snake.scene.agent.experienceAddEvery = cmd.value.learning_steps_per_iteration
    //snake.scene.spec.rivals = (Math.floor(cmd.value.size / 7) - 1) * 2
    //snake.resizeTo(cmd.value.size, cmd.value.size)
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
        mode: 'server'
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
    snake.loadLevel('level1')
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
        const nextRule = curriculum.filter(one => one.epoch > snake.scene.result.epoch)[0]
        if (nextRule && nextRule.id !== curRule.id) {
            console.log(snake.scene.modelName + ': Apply rule: ', nextRule)
            curRule = nextRule
            if (nextRule.epsilon) {
                snake.scene.spec.epsilon = nextRule.epsilon
                snake.scene.agent.epsilon = nextRule.epsilon
            }
            if (nextRule.level) {
                snake.loadLevel(nextRule.level)
            }
        }
        if (snake.scene.result.epoch > 30000 && snake.scene.result.epoch - lastEpoch > 1000) {
            snake.loadLevel(levels[Math.floor(Math.random() * levels.length)])
            snake.printField()
            lastEpoch = snake.scene.result.epoch
        }
    }
}, 1000)
