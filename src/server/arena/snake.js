var fs = require('fs')
const DQNAgent = require('reinforcenode').DQNAgent
const colorText = require('../debug').colorText
var jsonfile = require('jsonfile')

var oneStepCreator = state => {
    return () => {
        state.nextStep()
        if (state.scene.nextStep) {
            // setTimeout(() => {
            //     state.scene.interval = setImmediate(state.scene.nextStep)
            // }, 300)
            state.scene.interval = setImmediate(state.scene.nextStep)
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
    scene.spec = model.spec
    scene.target = {
        x: scene.maxX - 1,
        y: scene.maxY - 1
    }
    scene.actor = Object.assign({}, JSON.parse(JSON.stringify(scene.defaultActor)))
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
    scene.actor = cmd.actor
    scene.spec = cmd.spec
    scene.defaultActor = Object.assign({}, JSON.parse(JSON.stringify(cmd.actor)))
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
    const state = require('../../common/snake-scene').instance({
        mode: 'server'
    })
    state.initScene()

    const scene = state.scene

    scene.aiName = 'SNAKE'

    const oneStep = oneStepCreator(state)
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
            const fileName = __dirname.replace('server/arena', 'models/' + cmd.name + '.json')
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
        updateLearningSpec: cmd => {
            scene.spec = cmd.value
            scene.agent.epsilon = cmd.value.epsilon
            scene.agent.alpha = cmd.value.alpha
            scene.agent.gamma = cmd.value.gamma
            scene.agent.experienceSize = cmd.value.experience_size
            scene.agent.experienceAddEvery = cmd.value.learning_steps_per_iteration
        },
        saveModel: cmd => {
            const fileName = __dirname.replace('server/arena', 'models/' + cmd.name + '.json')
            const model = Object.assign(
                {},
                {
                    arena: 'SNAKE',
                    spec: scene.spec, //cmd.spec,
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
