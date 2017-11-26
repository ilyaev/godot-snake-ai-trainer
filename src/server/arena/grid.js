var fs = require('fs')
const DQNAgent = require('reinforcenode').DQNAgent
const colorText = require('../debug').colorText
var jsonfile = require('jsonfile')

const actions = [
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

const restartActor = (scene, reward) => {
    if (reward > 0) {
        scene.target.x = Math.round(Math.random() * scene.maxX)
        scene.target.y = Math.round(Math.random() * scene.maxY)
    }
    scene.actor.x = 0
    scene.actor.y = 0
    scene.actor.step = 0
    return scene
}

var oneStepCreator = scene => {
    return () => {
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
            scene.agent.learn(0)
        }
        scene.result.step++
        if (scene.nextStep) {
            scene.interval = setImmediate(scene.nextStep)
        }
    }
}

const initGameFromModel = (scene, model) => {
    if (scene.interval) {
        clearImmediate(scene.interval)
    }
    scene.agent = new DQNAgent(
        {
            getNumStates: () => model.params.numStates,
            getMaxNumActions: () => model.params.numActions
        },
        model.spec
    )
    scene.agent.fromJSON(model.brain)
    scene.result = model.result
    scene.reward = 0
    scene.maxX = model.params.maxX
    scene.maxY = model.params.maxY
    scene.target = model.params.target
    scene.actor.x = 0
    scene.actor.y = 0
}

const initGame = (scene, cmd, ai = false) => {
    if (scene.interval) {
        clearImmediate(scene.interval)
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
}

const sendStatus = (socket, scene) => {
    socket.sendCommand(socket, 'STATUS', {
        result: scene.result,
        actor: scene.actor,
        target: scene.target,
        brain: scene.agent.toJSON()
    })
}

const arena = (io, socket) => {
    var scene = {
        agent: false,
        timeScale: 1,
        maxX: 0,
        maxY: 0,
        target: {
            x: 0,
            y: 0
        },
        params: {
            numStates: 4,
            numActions: 4,
            target: {
                x: 0,
                y: 0
            }
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
        aiName: false,
        interval: false
    }

    const oneStep = oneStepCreator(scene)
    scene.nextStep = oneStep

    return {
        initGame: cmd => {
            initGame(scene, cmd)
            scene.interval = setImmediate(oneStep)
        },
        sendStatus: () => {
            return sendStatus(socket, scene)
        },
        loadAI: cmd => {
            scene.aiName = cmd.name
            const fileName = __dirname.replace('server', 'models/' + cmd.name + '.json')
            fs.readFile(fileName, 'utf8', function(err, json) {
                if (!err) {
                    console.log(colorText('green', '-load existing'), colorText('navy', cmd.name))
                    var ai = JSON.parse(json)
                    initGameFromModel(scene, ai)
                    scene.interval = setImmediate(oneStep)
                } else {
                    console.log(colorText('red', '-start new'), colorText('navy', cmd.name))
                    initGame(scene, cmd)
                    scene.interval = setImmediate(oneStep)
                }
                sendStatus(socket, scene)
            })
        },
        updateLearningScale: cmd => {
            scene.timeScale = cmd.value
        },
        saveModel: cmd => {
            const fileName = __dirname.replace('server/arena', 'models/' + cmd.name + '.json')
            const model = Object.assign(
                {},
                {
                    spec: cmd.spec,
                    name: cmd.name,
                    result: scene.result,
                    params: Object.assign({}, scene.params, {
                        maxX: scene.maxX,
                        maxY: scene.maxY
                    }),
                    brain: scene.agent.toJSON()
                }
            )
            jsonfile.writeFile(fileName, model, { spaces: 2 }, function(err) {
                if (!err) {
                    console.log(colorText('green', '-Success'))
                } else {
                    console.log(colorText('red', '-Fail'), err)
                }
            })
        },
        getTimeScale: () => scene.timeScale
    }
}

module.exports = arena
