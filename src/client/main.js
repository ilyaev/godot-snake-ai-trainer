import p5 from 'p5'
import p5dom from 'p5/lib/addons/p5.dom'
import config from './config'
import sceneDrawer from './systems/drawScene'
import sceneUpdater from './systems/updateScene'
import socketClient from './systems/socket'
import scene from './scene'
import { setInterval } from 'core-js/library/web/timers'

const drawScene = sceneDrawer(scene)
const updateScene = sceneUpdater(scene)
const socket = socketClient(scene)()

var statusIntervalId

const sketch = function(p) {
    p.setup = function() {
        p.frameRate(10)
        p.createCanvas(window.innerWidth, window.innerHeight)
        scene.canvas = p
        socket.on('HANDSHAKE', cmd => {
            console.log('HS: ', cmd)
            socket.start()
            //socket.loadAi('test')
            if (statusIntervalId) {
                clearInterval(statusIntervalId)
            }
            statusIntervalId = setInterval(() => {
                socket.getStatus()
            }, 5000)
        })
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
                scene.timeScale = scene.timeScale == 1 ? 10000 : 1
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
    }

    setup = function() {
        this.myp5 = new p5(sketch, this.element)
    }
}
