/*!
 * parseurl
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies. 所依赖的模块
 * @private
 */

var url = require('url');
var parse = url.parse;
var Url = url.Url;

/**
 * Module exports. 暴露的模块
 * @public
 */

module.exports = parseurl;  /*将parseurl作为模块暴露出去*/
module.exports.original = originalurl; /*将originalurl函数改名为original后暴露出去*/

/**
 * Parse the `req` url with memoization.
 *函数功能：用缓存解析req的url
 * @param {ServerRequest} req  参数类型：请求中的req 参数名：req
 * @return {Object}  返回值类型：对象
 * @public
 */

function parseurl (req) {
//console.log('进入parseurl函数') 
  var url = req.url;
  //如果url没有定义，返回undefined，退出函数
  if (url === undefined) {
    // URL is undefined
    return undefined;
  }
  //将req的_parsedUrl属性赋值给变量parsed，第一次进行url解析时此属性为undefined
  var parsed = req._parsedUrl;
  //对parsed进行判断，若url中存在满足fresh条件的parsed，则返回parsed
  if (fresh(url, parsed)) {
    // Return cached URL parse
    //console.log('fresh函数判断结果为true，返回缓存中的url，退出parseurl');
    return parsed;
  }
  
  // Parse the URL
  // 将url经过fastparse解析后赋值给parsed
  parsed = fastparse(url);
  //将未被解析的url赋值给parsedd的_raw属性
  parsed._raw = url;
  //给req添加一个名为_parseUrl的对象，将parsed赋值给它并返回
  //console.log('经过fastparse解析后返回url，退出parseurl函数')
  return (req._parsedUrl = parsed);
}

/**
 * Parse the `req` original url with fallback and memoization.
 *函数功能：利用回退和缓存来解析req的原始url
 * @param {ServerRequest} req  参数类型：请求中的req，参数名：req
 * @return {Object}  返回值类型：对象
 * @public
 */

function originalurl (req) {
  //console.log('进入originalurl函数');
  //声明变量url，赋值req.originalUrl
  var url = req.originalUrl;
  //判断url是否为字符串，若不是字符串则跳转parseurl(req)函数继续解析
  if (typeof url !== 'string') {
    // Fallback
    //console.log('退出originalurl函数，跳转parseurl函数');
    return parseurl(req);
  }
  
  //定义变量，将req._parsed)riginalUrl赋值给它，若req._parseOriginalUrl不存在，parsed为undifined
  var parsed = req._parsedOriginalUrl;
  //对parsed进行判断，若url中已经存在符合fresh条件的parsed，直接返回parsed
  if (fresh(url, parsed)) {
    // Return cached URL parse
    //console.log('fresh判断结果为true，返回缓存的url，退出originalurl函数');
    return parsed;
  }

  // Parse the URL
  // 将url通过fastpase解析后赋值给parsed
    parsed = fastparse(url);
  //将未经过解析的url赋值给parsedde _raw属性
  parsed._raw = url;
  //console.log('经过fastparse解析，返回结果');
  //给req添加名为_parseOriginalUrl的对象，将parsed复制给他，并返回
  return (req._parsedOriginalUrl = parsed);
}

/**
 * Parse the `str` url with fast-path short-cut.
 *函数功能，用耗时较短，快速的路径解析str
 * @param {string} str  参数类型：字符串 参数名：str
 * @return {Object}  返回值类型：对象
 * @private
 */

function fastparse (str) {
  //若str不是字符串或str的第一个元素不是斜杠，返回url.parse(str)
  if (typeof str !== 'string' || str.charCodeAt(0) !== 0x2f /* / */) {
    return parse(str)
  }
  //将参数str赋给变量pathname
  var pathname = str;
  //定义变量query和search都为null
  var query = null;
  var search = null;

  // This takes the regexp from https://github.com/joyent/node/pull/7878
  // Which is /^(\/[^?#\s]*)(\?[^#\s]*)?$/
  // And unrolls it into a for loop
  //console.log('进入fastparse解析函数');
  for (var i = 1; i < str.length; i++) {
    switch (str.charCodeAt(i)) {
      case 0x3f: /* ?  */
        if (search === null) {
          //截取字符串第0个位置到第i个位置赋值给pathname（将？之前的内容截取）
          pathname = str.substring(0, i);
          //截取字符串第i+1到结尾赋值给query（从？后一个截取到最后）
          query = str.substring(i + 1);
          //截取字符串第i到结尾赋值给search（从？截取到最后）
          search = str.substring(i);
        }
        break
      case 0x09: /* \t 空格 */
      case 0x0a: /* \n 换行 */
      case 0x0c: /* \f  */
      case 0x0d: /* \r */
      case 0x20: /*    */
      case 0x23: /* #  */
      case 0xa0: /* 汉字*/
      case 0xfeff:
        return parse(str);
    }
  }
  //当Url（url.Url）不是undefined时，url为new Url（），否则为空对象
  var url = Url !== undefined
    ? new Url()
    : {}
  url.path = str;
  url.href = str;
  url.pathname = pathname;
  url.query = query;
  url.search = search;
  
  //返回对象类型的url
  return url;
}

/**
 * Determine if parsed is still fresh for url.
 * 函数功能：判断url是否有_parsedUrl,即是否已经有缓存的url
 *
 * @param {string} url  参数类型：字符串，参数名：url
 * @param {object} parsedUrl  参数类型：对象，参数名：parsedUrl
 * @return {boolean}  返回值类型：布尔值
 * @private
 */

function fresh (url, parsed) {
  //console.log('进入fresh函数');
  //1.parsed是对象类型
  //2.parsed不是null
  //3.Url为undefined或parsed instanceof Url为true（第一次解析时，Url和parsed都为undefined，再一次解析时，parsed被fastparse解析成了Url类型的数据）
  //4.parsed._raw===url
  //四个条件同时满足返回true，有一个不满足返回false
  //
  return typeof parsed === 'object' &&
    parsed !== null &&
    (Url === undefined || parsed instanceof Url) &&
    parsed._raw === url;
}
