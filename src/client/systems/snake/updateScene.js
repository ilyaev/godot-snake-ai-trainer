import p5 from 'p5'

export const actions = [
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

const update = function(state) {
    const scene = state.scene
    // const growSnake = state.snake.growSnake
    // const isWall = state.snake.isWall
    // const restartActor = state.snake.restartActor

    return () => {
        for (let i = 0; i < scene.timeScale; i++) {
            state.snake.nextStep()
        }
    }
}

export default update
