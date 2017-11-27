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

var statusIntervalId = false
var pollIntervalId

const startLearning = () => {
    console.log('--START Learning')
    if (statusIntervalId) {
        clearInterval(statusIntervalId)
    }
    socket.loadAi(scene.modelName)
    statusIntervalId = setInterval(() => {
        socket.getStatus()
    }, 5000)
}

const stopLearning = () => {
    console.log('--STOP Learning')
    if (statusIntervalId) {
        clearInterval(statusIntervalId)
        statusIntervalId = false
    }
    socket.stopGame(scene.modelName)
}

const pollServer = () => {
    if (pollIntervalId) {
        clearInterval(pollIntervalId)
    }
    pollIntervalId = setInterval(() => {
        socket.getServerStatus()
    }, 1000)
}

const saveModel = () => {
    socket.saveModel(scene.modelName)
}

const renderConsole = text => {
    const height = 205
    const offsetX = 320
    const offsetY = window.innerHeight - height - 10
    const width = window.innerWidth - offsetX - 20
    return '<div id="gl-consol" style="overflow: auto; scroll: auto; font-size: 12px; font-family: \'Roboto Mono\', monospace; color:#e1822d; width: %WIDTH%px; height: %HEIGHT%px; background-color: black; border: 1px solid black; padding: 5px">%TEXT%</div>'
        .replace('%TEXT%', text)
        .replace('%WIDTH%', width)
        .replace('%HEIGHT%', height)
}

let consol
let dashboard

const sketch = function(p) {
    p.setup = function() {
        p.frameRate(10)
        p.createCanvas(window.innerWidth, window.innerHeight)
        scene.canvas = p

        let elConsole = p.createElement('div', renderConsole('Console here'))
        elConsole.position(320, window.innerHeight - 220)

        consol = (() => {
            const rows = []

            const refresh = () => elConsole.html(renderConsole(rows.join('<br>')))

            const scrollToBottom = () => {
                const el = document.getElementById('gl-consol')
                el.scrollTop = el.scrollHeight
                el.scrollIntoView(false)
            }

            return {
                log: (row, color = false) => {
                    rows.push(color ? '<font style="color:' + color + '">' + row + '</font>' : row)
                    refresh()
                    scrollToBottom()
                },
                set: txt => {
                    rows.length = 0
                    rows.push(txt)
                    refresh()
                    scrollToBottom()
                }
            }
        })()

        socket.setConsole(consol)
        socket.on('HANDSHAKE', cmd => {
            stopLearning()
            scene.connectionId = cmd.connectionId
            scene.serverInstanceId = cmd.serverInstanceId
            pollServer()
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

    stopLearning = () => {
        stopLearning()
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
        actions.add(this, 'stopLearning').name('Stop Learning')
        actions.add(this, 'saveModel').name('Save Model')
        actions.open()

        this.gui = gui
    }
}
