import p5 from 'p5'
import compose from '../../lib/compose'
import { actions } from './updateScene'

const draw = function(state) {
    const cellSize = 50
    const arrSize = 30

    const scene = state.scene
    const config = scene.config

    const setup = canvas => {
        canvas.background(125)
        return canvas
    }

    const drawDebug = function(canvas) {
        canvas.text('FPS: ' + canvas.frameRate().toFixed(2), 10, 20)
        return canvas
    }

    const drawGrid = canvas => {
        for (let x = 0; x <= scene.maxX; x++) {
            for (let y = 0; y <= scene.maxY; y++) {
                const nX = x * cellSize
                const nY = y * cellSize

                canvas.push()

                canvas.rect(nX, nY, cellSize, cellSize)

                canvas.pop()
            }
        }

        ;[{ x: scene.actor.x, y: scene.actor.y }].concat(scene.actor.tail).forEach(one => {
            canvas.push()
            canvas.fill('green')
            canvas.translate(one.x * cellSize, one.y * cellSize)
            canvas.rect(2, 2, cellSize - 4, cellSize - 4)
            canvas.pop()
        })

        canvas.push()
        canvas.fill('red')
        canvas.translate(scene.target.x * cellSize, scene.target.y * cellSize)
        canvas.rect(2, 2, cellSize - 4, cellSize - 4)
        canvas.pop()

        return canvas
    }

    const drawComposer = compose(drawGrid, setup)

    return () => {
        drawComposer(scene.canvas)
    }
}

export default draw
