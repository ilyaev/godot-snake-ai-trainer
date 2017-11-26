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

import { restartActor } from '../../scene/grid'

const update = function(scene) {
    return () => {
        for (let i = 0; i < scene.timeScale; i++) {
            var state = [
                scene.actor.x / scene.maxX,
                scene.actor.y / scene.maxY,
                (scene.target.x - scene.actor.x) / scene.maxX,
                (scene.target.y - scene.actor.y) / scene.maxX
            ]
            var action = scene.agent.act(state)
            var act = actions[action]

            scene.actor.x = scene.actor.x + act.dx
            scene.actor.y = scene.actor.y + act.dy
            scene.actor.step += 1

            if (scene.actor.x == scene.target.x && scene.actor.y == scene.target.y) {
                //scene.agent.learn(1)
                restartActor(1)
            } else if (scene.actor.x < 0 || scene.actor.y < 0 || scene.actor.x > scene.maxX || scene.actor.y > scene.maxY) {
                //scene.agent.learn(-1)
                restartActor(-1)
            }
        }
    }
}

export default update
