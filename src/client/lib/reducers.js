


export const concatToArray = (result, next) => {
    return result.concat(next)
}

export const concatKeyToArray = (key) => {
    return (result, next) => {
        return result.concat(next[key])
    }
}