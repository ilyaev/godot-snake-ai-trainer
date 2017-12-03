var fs = require('fs')
const DQNAgent = require('reinforcenode').DQNAgent
const colorText = require('../debug').colorText

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

const createGame = (scene, name) => {
    if (scene.interval) {
        clearImmediate(scene.interval)
        scene.interval = false
    }
    scene.agent = new DQNAgent(
        {
            getNumStates: () => scene.params.numStates,
            getMaxNumActions: () => scene.params.numActions
        },
        scene.spec
    )
    scene.result = {
        step: 0,
        wins: 0,
        epoch: 0,
        history: [
            {
                e: 0,
                p: 0,
                t: 0,
                s: 0
            }
        ]
    }
    scene.reward = 0
    scene.modelName = name
    scene.aiName = name
    scene.name = name
    scene.history = []
}

const initGame = (scene, cmd, ai = false) => {
    if (scene.interval) {
        clearImmediate(scene.interval)
        scene.interval = false
    }
    scene.agent = new DQNAgent(
        {
            getNumStates: () => scene.params.numStates,
            getMaxNumActions: () => scene.params.numActions
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

    var status = 'IDLE'

    const startLearning = (start = true) => {
        if (!socket.worker) {
            return
        }
        status = 'RUNNING'
        socket.worker.start()
        socket.worker.command({
            cmd: 'learn',
            maxX: scene.maxX,
            maxY: scene.maxY,
            brain: scene.agent.toJSON(),
            params: scene.params,
            spec: scene.spec,
            actor: scene.actor,
            result: scene.result,
            start: start,
            modelName: scene.modelName
        })
    }

    const updateLearningSpec = spec => {
        let worker = socket.worker || io.workers.get(scene.modelName)
        if (worker) {
            worker.command({
                cmd: 'spec',
                value: spec
            })
        }
    }

    const saveModel = () => {
        const model = Object.assign(
            {},
            {
                arena: 'SNAKE',
                version: io.storage.get(scene.modelName).version || 1,
                spec: scene.spec,
                name: scene.modelName,
                modelName: scene.modelName,
                result: scene.result,
                maxX: scene.maxX,
                maxY: scene.maxY,
                params: Object.assign({}, scene.params, {
                    maxX: scene.maxX,
                    maxY: scene.maxY
                }),
                brain: scene.agent.toJSON()
            }
        )
        io.storage.set(scene.modelName, model)
    }

    return {
        initGame: cmd => {
            initGame(scene, cmd)
        },
        sendStatus: () => {
            return sendStatus(socket, scene)
        },
        stopGame: cmd => {
            if (!socket.worker) {
                return
            }
            status = 'STOPPED'
            socket.worker.command({
                cmd: 'finish'
            })
        },
        createModel: name => {
            createGame(scene, name)
            saveModel()
            io.storage.flush(name)
            sendStatus(socket, scene)
        },
        fromWorker: cmd => {
            switch (cmd.cmd) {
                case 'sync':
                    if (cmd.name !== scene.modelName) {
                        console.log(colorText('red', 'Alert: Concurrent model save'))
                    } else {
                        scene.agent.fromJSON(cmd.brain)
                        saveModel()
                        if (cmd.save) {
                            io.storage.flush(cmd.name)
                        }
                    }
                    break
                case 'status':
                    if (cmd.name !== scene.modelName) {
                        console.log(colorText('red', 'Alert: Concurrent model status'), cmd.name, scene.modelName)
                    } else {
                        scene.result = cmd.result
                        saveModel()
                    }
                    break
            }
        },
        loadAI: (cmd, start = true) => {
            scene.aiName = cmd.name
            scene.modelName = cmd.name
            const model = io.storage.get(cmd.name)

            if (model) {
                console.log(colorText('green', '-load existing'), colorText('navy', cmd.name))
                initGameFromModel(scene, model)
            } else {
                console.log(colorText('red', '-start new'), colorText('navy', cmd.name))
                initGame(scene, cmd)
                saveModel()
            }

            scene.modelName = cmd.name
            startLearning(start)
            sendStatus(socket, scene)
        },
        updateLearningScale: cmd => {
            scene.timeScale = cmd.value
        },

        updateModel: form => {
            scene.spec = Object.assign({}, scene.spec, form)
            updateLearningSpec(scene.spec)
            saveModel()
        },
        updateLearningSpec: cmd => {
            scene.spec = cmd.value
            scene.agent.epsilon = cmd.value.epsilon
            scene.agent.alpha = cmd.value.alpha
            scene.agent.gamma = cmd.value.gamma
            scene.agent.experienceSize = cmd.value.experience_size
            scene.agent.experienceAddEvery = cmd.value.learning_steps_per_iteration
            updateLearningSpec(cmd.value)
        },
        saveModel: cmd => {
            saveModel()
        },
        getTimeScale: () => scene.timeScale,
        getAiName: () => scene.aiName,
        getStatus: () => {
            return status
        },
        getScene: () => scene
    }
}

module.exports = arena
