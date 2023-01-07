const concat = (list) => Array.prototype.concat.bind(list);
const promiseConcat = (f) => (x) => f().then(concat(x));
const promiseReduce = <TResult>(acc: Promise<TResult>, x) => acc.then(promiseConcat(x));
/*
 * serial executes Promises sequentially.
 * @param {funcs} An array of funcs that return promises.
 * @example
 * const urls = ['/url1', '/url2', '/url3']
 * serial(urls.map(url => () => $.ajax(url)))
 *     .then(console.log.bind(console))
 */

export const serial = <TResult>(funcs: (() => Promise<TResult>)[]) => funcs.reduce(promiseReduce, Promise.resolve([]));