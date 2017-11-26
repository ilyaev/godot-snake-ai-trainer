const colorText = (color, text) => {
    const tpl = '\x1b[%COLOR%m\x1b[1m' + text + '\x1b[0m'

    const map = {
        red: '31',
        yellow: '33',
        green: '32',
        blue: '34',
        magenta: '35',
        navy: '36',
        gray: '30'
    }

    return tpl.replace('%COLOR%', map[color] ? map[color] : map.red)
}

module.exports = {
    colorText
}
