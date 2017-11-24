
export const replace = (src, target) => {
    src.length = 0
    while(target.length > 0) {
        src.push(target.pop())
    }
}