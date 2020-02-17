/**
 * 引用数据处理器，用于 JBDAP 中对引用数据进行各种处理
 * 注意引用类型的指令集均不支持级联属性
 */

// 运行环境准备
const { JS, JE } = require('./global')

// 引入相关模块
const parser = require('./parser')
const calculator = require('./calculator')

/**
 * 从原始数据中过滤出需要的数据字段并返回
 * @param {object} data 原始 entity 数据
 * @param {string|array} rawFields 要获取的字段
 * @param {string} lang 提示信息所用语言
 */
function getObjFromObj(data,rawFields,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // data 类型和 fields 有效性无需验证，已经可以得到保证
    try {
        if (rawFields === '*') return data
        let result = {}
        let keys = Object.keys(data)
        _.forEach(rawFields, (item) => {
            // 字段名
            if (_.isString(item)) {
                if (keys.indexOf(item) < 0) JS.throwError('FieldNotExistError',null,null,[
                    ['zh-cn',`原始数据中不存在 '${item}' 字段`],
                    ['en-us',`Field '${item}' doesn't exist in raw data`]
                ],lang)
                result[item] = data[item]
            }
            // 别名以单属性对象格式保存
            if (_.isPlainObject(item)) {
                let key = Object.keys(item)[0]
                if (keys.indexOf(item[key]) < 0) JS.throwError('FieldNotExistError',null,null,[
                    ['zh-cn',`原始数据中不存在 '${key}' 字段`],
                    ['en-us',`Field '${key}' doesn't exist in raw data`]
                ],lang)
                result[key] = data[item[key]]
            }
        })
        return result
    }
    catch (err) {
        JS.throwError('DealRefError',err,null,[
            ['zh-cn',`单个对象属性筛选出错`],
            ['en-us',`Filtering fields from one Object failed`]
        ],lang)
    }
}
module.exports.getObjFromObj = getObjFromObj

/**
 * 从原始数据列表中过滤出复合条件的单条数据，如果有多条符合，则取第一条
 * 支持 order、where，不支持 size、page 查询
 * @param {object} data 原始 list 数据
 * @param {object} query 指令中的 query 条件
 * @param {string|array} rawFields 要获取的字段
 * @param {object} root 数据存储根对象
 * @param {object} parent 父对象
 * @param {string} lang 提示信息所用语言
 */
function getObjFromList(data,query,rawFields,root,parent,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // data 类型和 fields 有效性无需验证，已经可以得到保证
    // 检查 query，引用查询不支持 where 和 order 之外的参数
    if (_.isPlainObject(query)) {
        let keys = Object.keys(query)
        _.each(keys,(key)=>{
            if (key !== 'where' && key !== 'order') JS.throwError('QueryDefError',null,null,[
                ['zh-cn',`查询条件不能包含 'where' 和 'order' 之外的参数`],
                ['en-us',`Query condition only accepts 'where' and 'order' as valid parameters`]
            ],lang)
        })
    }
    try {
        // console.log('getObjFromList')
        let result = null
        if (data.length === 0) return null
        if (_.isPlainObject(query)) {
            if (!_.isUndefined(query.order)) {
                // 进行数据排序
                // 查询所需参数
                let orderFields = []
                let orderDirections = []
                // 首先对数据进行排序
                let order = parser.parseOrder(query.order)
                if (order.length > 0) {
                    // 构建排序条件
                    for (let i=0; i<order.length; i++) {
                        orderFields.push(order[i].column)
                        orderDirections.push(order[i].order)
                    }
                    // 进行排序
                    data = _.orderBy(data,orderFields,orderDirections)
                    result = data[0]
                }
            }
            if (!_.isUndefined(query.where)) {
                // 进行数据过滤（找到第一条符合条件的即可）
                // 整理过滤条件对象
                let whereObj = {}
                if (_.isPlainObject(query.where)) {
                    // Object，意味着复杂条件
                    whereObj = query.where
                }
                // 逐条过滤直到找出第一条符合条件的
                // 注意这里应用的是比较运算规则，不是 sql 查询规则
                for (let i=0; i<data.length; i++) {
                    let item = data[i]
                    if (calculator.checkCondition('query',whereObj,'and',root,parent,item) === true) {
                        result = _.cloneDeep(item)
                        break
                    }
                }
                // 没有符合条件的直接返回 null
                if (result == null) return null
            }
        }
        // 如果没有经过筛选则取第一条返回
        else result = _.cloneDeep(data[0])
        // 对字段进行过滤
        if (result !== null) result = getObjFromObj(result,rawFields)
        // console.log(result)
        return result
    }
    catch (err) {
        // console.log(err.fullStack())
        JS.throwError('DealRefError',err,null,[
            ['zh-cn',`多条记录中筛选目标出错`],
            ['en-us',`Selecting one target from multiple records failed`]
        ],lang)
    }
}
module.exports.getObjFromList = getObjFromList

/**
 * 从原始数据列表中过滤出复合条件的多条数据
 * 支持 where、order、size、page 查询
 * @param {object} data 原始 list 数据
 * @param {object} query 指令中的 query 条件
 * @param {string|array} rawFields 要获取的字段
 * @param {object} root 数据存储根对象
 * @param {object} parent 父对象
 * @param {string} lang 提示信息所用语言
 */
function getListFromList(data,query,rawFields,root,parent,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // data 类型和 fields 有效性无需验证，已经可以得到保证
    try {
        let result = []
        if (data.length === 0) return null
        if (!_.isUndefined(query)) {
            // 先进行数据过滤
            if (!_.isUndefined(query.where)) {
                // 整理过滤条件对象
                let whereObj = {}
                if (_.isPlainObject(query.where)) {
                    // Object，意味着复杂条件
                    whereObj = query.where
                }
                // 逐条过滤
                for (let i=0; i<data.length; i++) {
                    let item = data[i]
                    if (calculator.checkCondition('query',whereObj,'and',root,parent,item) === true) {
                        result.push(_.cloneDeep(item))
                    }
                }
                // 没有符合条件的直接返回 null
                if (result == []) return null
            }
            else result = _.cloneDeep(data)
            // 再进行数据排序
            if (!_.isUndefined(query.order)) {
                // 查询所需参数
                let orderFields = []
                let orderDirections = []
                // 首先对数据进行排序
                let order = parser.parseOrder(query.order)
                if (order.length > 0) {
                    // 构建排序条件
                    for (let i=0; i<order.length; i++) {
                        orderFields.push(order[i].column)
                        orderDirections.push(order[i].order)
                    }
                    // 进行排序
                    result = _.orderBy(result,orderFields,orderDirections)
                }
            }
            // 数量控制
            let temp = []
            let pas = parser.parseOffsetAndLimit(query.page,query.size)
            if (pas.limit > 0) {
                // 有数量限制
                for (let i=pas.offset; i<pas.offset+pas.limit; i++) {
                    // 数组合法下标范围内
                    if (i >= 0 && i<result.length) temp.push(result[i])
                }
            }
            else {
                // 没有数量限制
                for (let i=pas.offset; i<result.length; i++) {
                    // 数组合法下标范围内
                    temp.push(result[i])
                }
            }
            result = temp
        }
        // 没有经过筛选
        else result = _.cloneDeep(data)
        // 对字段进行过滤
        let ret = []
        _.forEach(result, (item) => {
            ret.push(getObjFromObj(item,rawFields))
        })
        return ret
    }
    catch (err) {
        // console.log(err.fullStack())
        JS.throwError('DealRefError',err,null,[
            ['zh-cn',`多条记录中筛选多条记录出错`],
            ['en-us',`Selecting several records from multiple records failed`]
        ],lang)
    }
}
module.exports.getListFromList = getListFromList

/**
 * 对原始数据进行处理提取出需要的数据
 * @param {object} data 原始 list 数据
 * @param {string|array} valuesFields 要提取获取的字段
 * @param {string} lang 提示信息所用语言
 */
function getValuesFromList(data,valuesFields,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    try {
        if (valuesFields.length === 0) JS.throwError('CmdDefError',null,null,[
            ['zh-cn',`'values' 查询类型至少要定义一个取值字段`],
            ['en-us',`A 'values' type query needs one value field defined at least`]
        ],lang)
        let values = {}
        for (let i=0; i<valuesFields.length; i++) {
            // 传入查询结果进行处理
            let item = valuesFields[i]
            values[item.name] = calculator.getValue(data,item)
        }
        return values
    }
    catch (err) {
        JS.throwError('DealRefError',err,null,[
            ['zh-cn',`取值查询出错`],
            ['en-us',`Error occurred in this 'values' type query`]
        ],lang)
    }
}
module.exports.getValuesFromList = getValuesFromList
