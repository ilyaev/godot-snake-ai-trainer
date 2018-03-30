const DQNAgent = require('reinforcenode').DQNAgent
const UTILS = require('reinforcenode').UTILS

DQNAgent.prototype.act = function(slist, valid = [], forceRandom = 0) {
    let s = new UTILS.Mat(this.ns, 1)
    s.setFrom(slist)
    let a
    if (Math.random() < this.epsilon || forceRandom > 0) {
        if (valid.length > 0) {
            a = valid[UTILS.randi(0, valid.length)]
        } else {
            a = UTILS.randi(0, this.na)
        }
    } else {
        let amat = this.forwardQ(this.net, s, false)
        a = UTILS.maxi(amat.w)
    }
    this.s0 = this.s1
    this.a0 = this.a1
    this.s1 = s
    this.a1 = a
    return a
}

module.exports = {
    DQNAgent,
    R: UTILS,
    UTILS
}
