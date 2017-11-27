import config from '../config'
import { DQNAgent, UTILS as R } from 'reinforcenode'

const extraProperties = {
    io: null,
    autosave: false,
    autosaveTimeout: 50,
    autosaveLast: 0,
    modelName: '',
    connectionId: '',
    serverInstanceId: '',
    timeScale: 1,
    canvas: null,
    active: true
}

const creator = () => {
    const snake = require('../../common/snake-scene').instance({
        mode: 'client'
    })
    snake.scene = Object.assign(snake.scene, snake.clone(extraProperties))
    snake.scene.config = config
    snake.initScene()
    const scene = snake.scene

    const sceneEvents = {}
    const sceneEventsPrev = {}

    const processEvents = () => {
        for (var prop in sceneEvents) {
            if (
                typeof sceneEventsPrev[prop] !== 'undefined' &&
                typeof scene[prop] !== 'undefined' &&
                sceneEventsPrev[prop] !== JSON.stringify(scene[prop])
            ) {
                sceneEvents[prop](scene[prop], JSON.parse(sceneEventsPrev[prop]))
            }
            sceneEventsPrev[prop] = JSON.stringify(scene[prop])
        }
        if (scene.autosave && performance.now() - scene.autosaveLast > scene.autosaveTimeout * 1000) {
            scene.autosaveLast = performance.now()
            if (typeof sceneEvents.autosaveEvent !== 'undefined') {
                sceneEvents.autosaveEvent()
            }
        }
    }

    const listenToScene = (property, callback) => {
        sceneEvents[property] = callback
    }

    return {
        processEvents,
        listenToScene,
        scene,
        snake
    }
}

export default creator
