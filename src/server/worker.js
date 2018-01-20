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

const hometrain = [
    {
        epoch: 5000,
        id: 1,
        epsilon: 0.5
    },
    {
        epoch: 10000,
        id: 2,
        epsilon: 0.4
    },
    {
        epoch: 15000,
        id: 3,
        epsilon: 0.3
    },
    {
        epoch: 20000,
        id: 4,
        epsilon: 0.2
    },
    {
        epoch: 30000,
        id: 5,
        epsilon: 0.1
    },
    {
        epoch: 40000,
        id: 6,
        epsilon: 0.05
    },
    {
        epoch: 50000,
        id: 7,
        epsilon: 0.02
    },
    {
        epoch: 60000,
        id: 8,
        epsilon: 0.01
    }
]

const curriculum = [
    {
        level: 'empty8x8',
        epoch: 5000,
        id: 1,
        epsilon: 0.3
    },
    {
        level: 'empty8x8',
        epoch: 10000,
        id: 2,
        epsilon: 0.1
    },
    {
        level: 'empty8x8',
        epoch: 20000,
        id: 3,
        epsilon: 0.01
    },
    {
        epoch: 30000,
        id: 4,
        level: 'empty16x16',
        epsilon: 0.1
    },
    {
        epoch: 40000,
        id: 5,
        level: 'empty16x16',
        epsilon: 0.01
    },
    {
        epoch: 50000,
        id: 6,
        level: 'empty32x32',
        epsilon: 0.1
    },
    {
        epoch: 60000,
        id: 7,
        level: 'empty32x32',
        epsilon: 0.01
    },
    {
        id: 8,
        level: 'one',
        epoch: 70000,
        epsilon: 0.1
    },
    {
        id: 9,
        level: 'one',
        epoch: 80000,
        epsilon: 0.01
    },
    {
        id: 10,
        level: 'two',
        epoch: 90000,
        epsilon: 0.1
    },
    {
        id: 11,
        level: 'two',
        epoch: 100000,
        epsilon: 0.01
    },
    {
        id: 12,
        level: 'three',
        epoch: 110000,
        epsilon: 0.1
    },
    {
        id: 13,
        level: 'three',
        epoch: 120000,
        epsilon: 0.01
    },
    {
        id: 14,
        level: 'four',
        epoch: 130000,
        epsilon: 0.1
    },
    {
        id: 15,
        level: 'four',
        epoch: 140000,
        epsilon: 0.01
    },
    {
        id: 16,
        level: 'five',
        epoch: 150000,
        epsilon: 0.1
    },
    {
        id: 17,
        level: 'five',
        epoch: 160000,
        epsilon: 0.01
    },
    {
        id: 18,
        epoch: 170000,
        epsilon: 0.001
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
    console.log('params', snake.scene.params)
    snake.scene.spec = cmd.value
    snake.scene.agent.epsilon = cmd.value.epsilon
    snake.scene.agent.alpha = cmd.value.alpha
    snake.scene.agent.gamma = cmd.value.gamma
    snake.scene.agent.experienceSize = cmd.value.experience_size
    snake.scene.agent.experienceAddEvery = cmd.value.learning_steps_per_iteration
    if (cmd.value.level && cmd.value.level !== snake.scene.params.homelevel) {
        snake.scene.params.homelevel = cmd.value.level
        clearImmediate(handler)
        setTimeout(() => {
            console.log('-Change Level To: ', snake.scene.params.homelevel)
            snake.loadLevel(snake.scene.params.homelevel || 'empty8x8')
            run()
        }, 100)
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
        if (snake.scene.params.homelevel) {
            // const nextRule = hometrain.filter(one => one.epoch > snake.scene.result.epoch)[0]
            // if (nextRule && nextRule.id !== curRule.id) {
            //     console.log(snake.scene.modelName + ': Apply rule: ', nextRule)
            //     curRule = nextRule
            //     if (nextRule.epsilon) {
            //         snake.scene.spec.epsilon = nextRule.epsilon
            //         snake.scene.agent.epsilon = nextRule.epsilon
            //     }
            // }
        } else {
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
            if (snake.scene.result.epoch > 170000 && snake.scene.result.epoch - lastEpoch > 1000) {
                snake.loadLevel(levels[Math.floor(Math.random() * levels.length)])
                lastEpoch = snake.scene.result.epoch
                const newE = Math.random() > 0.8 ? 0.001 : 0.01 + Math.random() * 0.1
                snake.scene.spec.epsilon = newE
                console.log('Switch to level: ' + snake.scene.level.name + ' / e: ' + newE)
            }
        }
    }
}, 1000)
