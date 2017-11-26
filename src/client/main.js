import p5 from 'p5'
import p5dom from 'p5/lib/addons/p5.dom'
import config from './config'

import { sceneDrawer, sceneUpdater, socketClient, state } from './systems/snake/index'

import dat from 'dat-gui'
import { setInterval } from 'core-js/library/web/timers'

const scene = state.scene
const listenToScene = state.listenToScene

const drawScene = sceneDrawer(state)
const updateScene = sceneUpdater(state)
const socket = socketClient(state)()

var statusIntervalId

const startLearning = () => {
    if (statusIntervalId) {
        clearInterval(statusIntervalId)
    }
    socket.loadAi(scene.modelName)
    statusIntervalId = setInterval(() => {
        socket.getStatus()
    }, 5000)
}

const saveModel = () => {
    socket.saveModel(scene.modelName)
}

const sketch = function(p) {
    p.setup = function() {
        p.frameRate(10)
        p.createCanvas(window.innerWidth, window.innerHeight)
        scene.canvas = p
        socket.on('HANDSHAKE', cmd => {
            scene.connectionId = cmd.connectionId
            scene.serverInstanceId = cmd.serverInstanceId
            startLearning()
        })
        listenToScene('spec', (newValue, oldValue) => {
            socket.updateLearningSpec(newValue)
        })
        listenToScene('autosaveEvent', saveModel)
    }

    p.draw = function() {
        if (!scene.active) {
            return
        }

        p.background('black')

        updateScene()
        drawScene()
    }

    p.keyPressed = function(event) {
        switch (event.key) {
            case 's':
                console.log('SCENE', scene)
                break
            case 'l':
                console.log('LASTGEN', scene.simulation.last)
                break
            case 'c':
                console.clear()
                break
            case 'z':
                scene.timeScale = scene.timeScale == 1 ? 100 : 1
                console.log('scale - ', scene.timeScale + 'x')
                break
            case 'x':
                scene.timeScale = scene.timeScale == 1 ? 10 : 1
                console.log('scale - ', scene.timeScale + 'x')
                break
            default:
                scene.active = !scene.active
        }
    }

    p.mouseClicked = function(event, a, b) {}
}

export default class MainSketch {
    constructor(element) {
        this.element = element
        this.myp5 = false
        this.setup()
        this.setupGUI()
    }

    setup = function() {
        this.myp5 = new p5(sketch, this.element)
    }

    startLearning = () => {
        startLearning()
    }

    saveModel = () => {
        saveModel()
    }

    setupGUI = () => {
        var gui = new dat.gui.GUI({
            autoPlace: false,
            width: 300
        })

        document.getElementById('moveGUI').append(gui.domElement)

        gui
            .add(scene, 'modelName')
            .name('Model Name')
            .listen()

        gui
            .add(scene, 'connectionId')
            .name('Connection ID')
            .listen()
        gui
            .add(scene, 'serverInstanceId')
            .name('Server Instance ID')
            .listen()

        gui
            .add(scene, 'active')
            .name('Local Simulation')
            .listen()
        gui
            .add(scene, 'timeScale', 1, 200)
            .name('Simulation Speed')
            .step(1)
            .listen()
        gui
            .add(scene, 'autosave')
            .name('Autosave Model')
            .listen()
        gui
            .add(scene, 'autosaveTimeout', 1, 60)
            .name('Autosave Timeout')
            .listen()
            .step(1)

        var learning = gui.addFolder('DQN Params')
        learning
            .add(scene.spec, 'epsilon', 0, 0.5)
            .name('Epsilon')
            .listen()
        learning
            .add(scene.spec, 'alpha', 0.01, 0.3)
            .name('Alpha')
            .listen()
        learning
            .add(scene.spec, 'gamma', 0.1, 1)
            .name('Gamma')
            .listen()
        learning.open()

        var actions = gui.addFolder('Actions')
        actions.add(this, 'startLearning').name('Start Learning')
        actions.add(this, 'saveModel').name('Save Model')
        actions.open()

        this.gui = gui
    }
}
