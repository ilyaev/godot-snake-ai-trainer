const DQNAgent = require('reinforcenode').DQNAgent
const UTILS = require('reinforcenode').UTILS

DQNAgent.prototype.simulate = function(slist, a, reward) {
    const s0 = Object.assign({}, this.s0)
    const a0 = Object.assign({}, this.a0)
    const s1 = Object.assign({}, this.s1)
    const a1 = Object.assign({}, this.a1)

    let s = new UTILS.Mat(this.ns, 1)

    s.setFrom(slist)

    this.s0 = this.s1
    this.a0 = this.a1
    this.s1 = s
    this.a1 = a

    this.learn(reward)

    if (s0.n) {
        this.s0 = s0
        this.a0 = a0
        this.s1 = s1
        this.a1 = a1
    }
}

DQNAgent.prototype.actLimited = function(slist, alowed) {
    if (alowed.length <= 0) {
        return -1
    }
    // convert to a Mat column vector
    let s = new UTILS.Mat(this.ns, 1)
    s.setFrom(slist)
    // epsilon greedy policy
    let a
    if (Math.random() < this.epsilon) {
        var ai = UTILS.randi(0, alowed.length)
        a = alowed[ai]
    } else {
        // greedy wrt Q function
        let amat = this.forwardQ(this.net, s, false)

        let w = amat.w.reduce(
            (res, next, index) => {
                if (next > res.w && alowed.indexOf(index) !== -1) {
                    res.index = index
                    res.w = next
                }
                return res
            },
            { index: alowed[0], w: amat.w[alowed[0]] }
        )

        a = UTILS.maxi(amat.w) // returns index of argmax action
        if (w.index != a) {
            a = w.index
        }
    }
    // shift state memory
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
