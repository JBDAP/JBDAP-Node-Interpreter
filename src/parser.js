/**
 * 解析器，用于 JBDAP 处理过程中的各类定义解析
 */

// 运行环境准备
const { JS, JE } = require('./global')

/**
 * 将键值对解析成结构体
 * @param {string} type 类型：compare|query
 * @param {string} key 键名
 * @param {string} value 值
 * @param {string} lang 提示信息所用语言
 */
function parseComparision(type,key,value,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    try {
        // 单一条件解析
        let comparision = {
            left: '',
            operator: 'eq',
            right: ''
        }
        // 键名包含了要比较的对象和比较运算符，用 # 分割
        let pieces = key.split('#')
        // 如果省略了 # 意味着是 eq 运算
        if (pieces.length === 1) {
            comparision.left = pieces[0]
            comparision.operator = 'eq'
            comparision.right = value
        }
        // 没有省略的话则解析出来
        if (pieces.length === 2) {
            // 检查错误的键名写法
            if (pieces[0] === '' || pieces[1] === '') JS.throwError('OpDefError',null,null,[
                ['zh-cn',`'${key}' 定义有误，'#' 符号两侧均不能为空字符串`],
                ['en-us',`'${key}' is invalid，empty String is not allowed in both left and right sides around '#'`]
            ],lang)
            // 检查是否有不支持的运算符
            if (type === 'compare' && JE.COMPARE_OPS.indexOf(pieces[1]) < 0) JS.throwError('OpDefError',null,null,[
                ['zh-cn',`'${key}' 定义有误，不支持 '${pieces[1]}' 运算符`],
                ['en-us',`'${key}' is invalid，operator '${pieces[1]}' is not supported`]
            ],lang)
            if (type === 'query' && JE.QUERY_OPS.indexOf(pieces[1]) < 0) JS.throwError('OpDefError',null,null,[
                ['zh-cn',`'${key}' 定义有误，不支持 '${pieces[1]}' 运算符`],
                ['en-us',`'${key}' is invalid，operator '${pieces[1]}' is not supported`]
            ],lang)
            comparision.left = pieces[0]
            comparision.operator = pieces[1]
            comparision.right = value
        }
        if (pieces.length > 2) JS.throwError('OpDefError',null,null,[
            ['zh-cn',`'${key}' 定义有误，有多于1个 '#' 符号`],
            ['en-us',`'${key}' is invalid，having more than one '#' is not allowed`]
        ],lang)
        return comparision
    }
    catch (err) {
        JS.throwError('ComparisionParserError',err,null,[
            ['zh-cn',`单个比较运算条件解析失败`],
            ['en-us',`Error occurred while parsing single comparision`]
        ],lang)
    }
}
module.exports.parseComparision = parseComparision

/**
 * 将 cmd 中的 fields 分类拆分
 * @param {object} fields 要解析的对象
 * @param {string} lang 提示信息所用语言
 */
function parseFields(fields,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // 解析 fields 定义需要考虑三种情况
    // 1、原生字段
    // 2、级联字段（数据从关联表查询得来）
    // 3、values 查询类型要求返回的聚合字段
    if (_.isUndefined(fields)) return {
        raw: '*',
        values: [],
        cascaded: []
    }
    let values = []
    let rawFields = []
    let cascadedFields = []
    try {
        let list = []
        // 把字符串定义转数组
        if (_.isString(fields)) {
            // 对字符串的缩略写法进行解析
            // 经过验证的 fields 字段不可能为空，但有可能是 *
            if (fields === '*') list.push('*')
            else {
                // 以 , 分割字段名
                let slices = fields.split(',')
                if (slices.length === 1) list.push(slices[0])
                else {
                    for (let i=0; i<slices.length; i++) {
                        if (slices[i] !== '') list.push(slices[i])
                    }
                }
            }
        }
        else list = fields
        // 处理数组
        let hasStar = false
        _.forEach(list, (item) =>{
            if (_.isString(item)) {
                if (item === '*') {
                    rawFields.push('*')
                    hasStar = true
                }
                else {
                    // 为性能考虑，提前终止错误定义的解析
                    if (hasStar) JS.throwError('FieldsDefError',null,null,[
                        ['zh-cn',`字段 '${item}' 定义有误，前面已经有 * 就不能再定义其它字段名`],
                        ['en-us',`Invalid field '${item}' definition，no more fields can be defined after a '*'`]
                    ],lang)
                    // 用 => 解析别名
                    let slices = item.split('=>')
                    if (slices.length === 1) rawFields.push(item)
                    else if (slices.length === 2) {
                        if (slices[0] === '' || slices[1] === '') JS.throwError('FieldsDefError',null,null,[
                            ['zh-cn',`字段 '${item}' 定义有误，'=>' 两侧都不能是空字符串`],
                            ['en-us',`Invalid field '${item}' definition，empty String is not allowed in both left and right sides around '=>'`]
                        ],lang)
                        // 判断是否 values 字段
                        let pieces = slices[0].split('#')
                        if (pieces.length === 1) {
                            // 没有 # 说明是字段别名写法
                            // 用一个含有单个属性的对象来保存别名字段
                            let temp = {}
                            temp[slices[1]] = slices[0]
                            rawFields.push(temp)
                        }
                        else if (pieces.length === 2) {
                            // 有 # 则说明是 values 定义
                            // 左右都不能为空
                            if (pieces[0] === '' || pieces[1] === '') JS.throwError('FieldsDefError',null,null,[
                                ['zh-cn',`字段 '${item}' 定义有误，'#' 两侧都不能是空字符串`],
                                ['en-us',`Invalid field '${item}' definition，empty String is not allowed in both left and right sides around '#'`]
                            ],lang)
                            // 对 values 运算符进行解析
                            let temp = {
                                name: slices[1],
                                operator: pieces[0],
                                fields: pieces[1]
                            }
                            values.push(temp)
                        }
                        else JS.throwError('FieldsDefError',null,null,[
                            ['zh-cn',`字段 '${item}' 定义有误，有多于1个 '#' 符号`],
                            ['en-us',`Invalid field '${item}' definition，having more than one '#' is not allowed`]
                        ],lang)
                    }
                    else JS.throwError('FieldsDefError',null,null,[
                        ['zh-cn',`字段 '${item}' 定义有误，有多于1个 '=>' 符号`],
                        ['en-us',`Invalid field '${item}' definition，having more than one '=>' is not allowed`]
                    ],lang)
                } 
            }
            else if (_.isPlainObject(item)) {
                cascadedFields.push(item)
            }
            else JS.throwError('FieldsDefError',null,null,[
                ['zh-cn',`'fields' 数组元素必须是 String 或者 Object`],
                ['en-us',`Each element in 'fields' must be a String or an Object`]
            ],lang)
        })
        // 检查是否 * 与其它字段并存于原始字段定义里
        if (rawFields.indexOf('*') >= 0 && rawFields.length > 1) JS.throwError('FieldsDefError',null,null,[
            ['zh-cn',`请检查 'fields' 定义，* 不能与其它字段定义同时出现`],
            ['en-us',`Please check the 'fields' property, once you have a '*', other fields are not allowed to exist`]
        ],lang)
        // 只含有 '*' 则转字符串
        if (rawFields.indexOf('*') >= 0 && rawFields.length === 1) rawFields = '*'
        return {
            raw: rawFields,
            values: values,
            cascaded: cascadedFields
        }
    }
    catch (err) {
        JS.throwError('FieldsPaserError',err,null,[
            ['zh-cn',`解析 fields 出错`],
            ['en-us',`Error occurred while parsing 'fields' property`]
        ],lang)
    }
}
module.exports.parseFields = parseFields

/**
 * 解析 cmd 中的 query.order 配置
 * @param {object|string} order query 中的 order 定义
 * @param {string} lang 提示信息所用语言
 */
function parseOrder(order,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // 未定义
    if (_.isUndefined(order)) return []
    try {
        // 字符串类型转成数组赋值给 order 参数，以供统一处理
        if (_.isString(order)) {
            let temp = []
            let slices = order.split(',')
            for(let i=0; i<slices.length; i++) {
                if (slices[i] !== '') temp.push(slices[i])
            }
            order = temp
        }
        // 数组类型
        if (_.isArray(order)) {
            let result = []
            for (let i=0; i<order.length; i++) {
                if (!_.isString(order[i])) JS.throwError('OrderDefError',null,null,[
                    ['zh-cn',`下标为 ${i} 的元素不是 String 类型`],
                    ['en-us',`The element with index ${i} is not a String`]
                ],lang)
                let slices = order[i].split('#')
                if (slices.length === 1) {
                    result.push({
                        column: slices[0],
                        order: 'asc'
                    })
                }
                else if (slices.length === 2) {
                    if (slices[0] === '' || slices[1] === '') JS.throwError('OrderDefError',null,null,[
                        ['zh-cn',`'${order[i]}' 定义有误，'#' 符号两侧均不能为空字符串`],
                        ['en-us',`'${order[i]}' is invalid，empty String is not allowed in both left and right sides around '#'`]
                    ],lang)
                    result.push({
                        column: slices[0],
                        order: slices[1]
                    })
                }
                else JS.throwError('OrderDefError',null,null,[
                    ['zh-cn',`'${order[i]}' 定义有误，有多于1个 '#' 符号`],
                    ['en-us',`'${order[i]}' is invalid，having more than one '#' is not allowed`]
                ],lang)
            }
            return result
        }
    }
    catch (err) {
        JS.throwError('OrderPaserError',err,null,[
            ['zh-cn',`解析 order 出错`],
            ['en-us',`Error occurred while parsing 'order' property`]
        ],lang)
    }
}
module.exports.parseOrder = parseOrder

/**
 * 解析查询偏移及数量控制参数
 * @param {integer} page 第几页
 * @param {integer} size 每页记录数
 * @param {string} lang 提示信息所用语言
 */
function parseOffsetAndLimit(page,size,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    let result = {
        offset: 0,
        limit: 0
    }
    try {
        // 均未定义
        if (_.isUndefined(page) && _.isUndefined(size)) return result
        // 只定义了 size 未定义 page
        if (!_.isUndefined(size) && _.isUndefined(page)) {
            result.limit = size
            return result
        }
        // 只定义了 page 未定义 size
        if (!_.isUndefined(page) && _.isUndefined(size)) {
            JS.throwError('SizeDefError',null,null,[
                ['zh-cn',`如果定义了 'page'，也必须定义 'size'`],
                ['en-us',`If you have defined a 'page', one 'size' definition is required too`]
            ],lang)
        }
        // 两个都有定义
        if (!_.isUndefined(size) && !_.isUndefined(page)) {
            if (!_.isInteger(size)) JS.throwError('SizeDefError',null,null,[
                ['zh-cn',`'size' 参数必须是一个整数`],
                ['en-us',`'size' definition must be an Integer`]
            ],lang)
            if (!_.isInteger(page)) JS.throwError('PageDefError',null,null,[
                ['zh-cn',`'page' 参数必须是一个整数`],
                ['en-us',`'page' definition must be an Integer`]
            ],lang)
            result.offset = (page - 1) * size
            result.limit = size
            return result
        }
    }
    catch (err) {
        JS.throwError('QueryPaserError',err,null,[
            ['zh-cn',`解析 page 和 size 出错`],
            ['en-us',`Error occurred while parsing 'page' and 'size'`]
        ],lang)
    }
}
module.exports.parseOffsetAndLimit = parseOffsetAndLimit
