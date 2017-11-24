const compose  = (fn, ...rest) =>
  rest.length === 0 ?
    fn :
    (...args) => fn(compose(...rest)(...args));


export default compose