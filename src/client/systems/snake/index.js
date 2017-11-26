import sceneDrawer from './drawScene'
import sceneUpdater from './updateScene'
import socketClient from './socket'

import stateCreator from '../../scene/snake'

const state = stateCreator()

const urlParam = document.location.hash.replace('#', '').trim()
if (urlParam) {
    state.scene.modelName = urlParam
}

setInterval(state.processEvents, 1000)

module.exports = {
    sceneDrawer,
    sceneUpdater,
    socketClient,
    state
}
