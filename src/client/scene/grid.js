import config from '../config'
import { DQNAgent, UTILS as R } from 'reinforcenode'

const sceneEvents = {}
const sceneEventsPrev = {}

const scene = {
    io: null,
    autosave: false,
    autosaveTimeout: 10,
    autosaveLast: performance.now(),
    modelName: '',
    connectionId: '',
    serverInstanceId: '',
    timeScale: 1,
    config,
    canvas: null,
    active: true,
    maxX: 15,
    maxY: 15,
    env: {
        getNumStates: function() {
            return 4
        },
        getMaxNumActions: function() {
            return 4
        }
    },
    params: {
        numStates: 4,
        numActions: 4
    },
    spec: { alpha: 0.03, epsilon: 0.4, learning_steps_per_iteration: 40, experience_size: 10000, gamma: 0.75 },
    actor: {
        x: 0,
        y: 0,
        averageSteps: 0,
        step: 0
    },
    target: {
        x: 6,
        y: 6
    },
    qvalues: {},
    agent: null
}

export const calculateQvalue = () => {
    for (var x = 0; x <= scene.maxX; x++) {
        for (var y = 0; y <= scene.maxY; y++) {
            var s = new R.Mat(scene.agent.ns, 1)
            s.setFrom([x / scene.maxX, y / scene.maxY, (scene.target.x - x) / scene.maxX, (scene.target.y - y) / scene.maxY])
            var amat = scene.agent.forwardQ(scene.agent.net, s, false)
            var a = R.maxi(amat.w) // returns index of argmax action
            scene.qvalues[x][y] = amat.w.map(one => Math.round(one * 1000) / 1000)
        }
    }
}

const processEvents = () => {
    for (var prop in sceneEvents) {
        if (typeof sceneEventsPrev[prop] !== 'undefined' && typeof scene[prop] !== 'undefined' && sceneEventsPrev[prop] !== scene[prop]) {
            sceneEvents[prop](scene[prop], sceneEventsPrev[prop])
        }
        sceneEventsPrev[prop] = scene[prop]
    }
    if (scene.autosave && performance.now() - scene.autosaveLast > scene.autosaveTimeout * 1000) {
        scene.autosaveLast = performance.now()
        if (typeof sceneEvents.autosaveEvent !== 'undefined') {
            sceneEvents.autosaveEvent()
        }
    }
}

const initScene = () => {
    scene.agent = new DQNAgent(scene.env, scene.spec)
    scene.modelName = 'model-' + Math.round(Math.random() * 1000)

    const urlParam = document.location.hash.replace('#', '').trim()
    if (urlParam) {
        scene.modelName = urlParam
    }

    for (var x = 0; x <= scene.maxX; x++) {
        if (!scene.qvalues[x]) {
            scene.qvalues[x] = []
        }
        for (var y = 0; y <= scene.maxY; y++) {
            scene.qvalues[x][y] = 0
        }
    }
    setInterval(processEvents, 1000)
    calculateQvalue()
}

initScene()

export const restartActor = reward => {
    if (reward > 0) {
        //console.log('RESTART! ', scene.actor.step)
        scene.target.x = Math.round(Math.random() * scene.maxX)
        scene.target.y = Math.round(Math.random() * scene.maxY)
    }
    scene.actor.x = 0
    scene.actor.y = 0
    scene.actor.step = 0
    calculateQvalue()
}

export const listenToScene = (property, callback) => {
    sceneEvents[property] = callback
}

export default scene
