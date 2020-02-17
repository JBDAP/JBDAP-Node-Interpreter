/**
 * 计算器，用于 JBDAP 处理过程中的各类条件运算
 */

// 运行环境准备
const { JS, JE } = require('./global')

// 引入相关模块
const parser = require('./parser')

/**
 * 条件运算
 * @param {string} type 要应用的计算规则：compare 用于 onlyIf，而 query 用于 where
 * @param {object} obj 要计算的条件
 * @param {string} relation 顶层属性之间的关系
 * @param {object} root 数据根目录
 * @param {object} parent 父对象
 * @param {object} self 自身对象
 * @param {string} lang 提示信息所用语言
 */
function checkCondition(type,obj,relation,root,parent,self,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    let res = []
    try {
        // 从顶层开始计算每一个条件
        let keys = Object.keys(obj)
        for (let i=0;i<keys.length; i++) {
            let key = keys[i]
            let value = obj[key]
            let result = true
            // key 的处理
            // 如果是 $or/$and/$not 表达式
            if (key === '$or' || key === '$and' || key === '$not') {
                result = checkCondition(type,value,key.replace('$',''),root,parent,self)
            }
            // 常规等值表达式
            else {
                // 先解析
                let comparision = parser.parseComparision(type,key,value)
                result = compare(comparision,root,parent,self)
                // console.log(comparision.left,result)
            }
            // 检查结果
            if (relation === 'and') {
                if (result === false) return false
                else res.push(true)
            }
            else if (relation === 'or') {
                if (result === true) return true
                else res.push(false)
            }
            else res.push(result)
        }
        // 汇总比较结果
        if (relation === 'and') return true
        else if (relation === 'or') return false
        else if (relation === 'not') {
            // not 比较，本质上是对所有子项进行 and 运算然后取反
            let summary = true
            _.forEach(res,(item) => {
                summary = summary && item
            })
            return !summary
        }
        else JS.throwError('ConditionDefError',null,null,[
            ['zh-cn','运算条件定义有误'],
            ['en-us','Invalid condition definition']
        ],lang)
    }
    catch (err) {
        JS.throwError('ConditionCalError',err,null,[
            ['zh-cn','条件运算出错'],
            ['en-us','Error occurred in condation calculation']
        ],lang)
    }
}
module.exports.checkCondition = checkCondition

/**
 * 单条件比较运算
 * @param {object} comparision 比较结构体
 * @param {object} root 数据根目录
 * @param {object} parent 父对象
 * @param {object} self 自身对象
 * @param {string} lang 提示信息所用语言
 */
function compare(comparision,root,parent,self,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    try {
        let left = comparision.left, right = comparision.right, operator = comparision.operator
        if (_.isString(left)) left = tag2value(left,root,parent,self)
        if (_.isString(right)) {
            // TODO: 暂时不理解为什么这样
            // 不论 self 是否为空，comparision.right 都不允许自身属性参与运算
            if (self === null) right = tag2value(right,root,parent,self)
            else right = tag2value(right,root,parent,null)
        }
        // console.log(left,comparision.operator,right)
        //
        // 注意这里的运算与 sql 条件里的略有不同
        // 没有 like 和 notLike
        // 没有 between 和 notBetween
        // 多了 match 和 notMatch
        // 多了 exist 和 notExist
        // 多了 isUndefined 和 isNotUndefined
        // 多了 isEmpty 和 isNotEmpty
        //
        // 一个特殊情况，当 left 是 {NotExist} 时
        // 运算符只能是 exist 或者 notExist，否则报错
        if (left === '{NotExist}' && operator !== 'exist' && operator !== 'doesNotExist') {
            JS.throwError('TagDefError',null,null,[
                ['zh-cn',`标签 '${comparision.left}' 路径中有不存在的属性`],
                ['en-us',`Some property does not exists in path '${comparision.left}'`]
            ],lang)
        }
        switch (operator) {
            case 'eq':
                return left == right
            case 'ne':
                return left != right
            case 'gte':
                return left >= right
            case 'gt':
                return left > right
            case 'lte':
                return left <= right
            case 'lt':
                return left < right
            case 'in':
                return right.indexOf(left) >= 0
            case 'notIn':
                return right.indexOf(left) < 0
            case 'contains':
                return left.indexOf(right) >= 0
            case 'doesNotContain':
                return left.indexOf(right) < 0
            case 'startsWith':
                return left.indexOf(right) === 0
            case 'doesNotStartWith':
                return left.indexOf(right) !== 0
            case 'endsWith': {
                if (_.isString(left)) return left.indexOf(right) === left.length - right.length
                if (_.isArray(left)) return left.indexOf(right) === left.length - 1               
            }
            case 'doesNotEndWith': {
                if (_.isString(left)) return left.indexOf(right) !== left.length - right.length
                if (_.isArray(left)) return left.indexOf(right) !== left.length - 1               
            }
            case 'matches':
                return left.search(right) >= 0
            case 'doesNotMatch':
                return left.search(right) < 0
            case 'exists':
                return (left != '{NotExist}') == right
            case 'doesNotExist':
                return (left == '{NotExist}') == right
            case 'isNull':
                return _.isNull(left) == right
            case 'isNotNull':
                return _.isNull(left) != right
            case 'isUndefined':
                return _.isUndefined(left) == right
            case 'isNotUndefined':
                return _.isUndefined(left) != right
            case 'isEmpty': {
                if (_.isString(left)) return (left == '') == right
                if (_.isArray(left)) return (left.length == 0) == right
                if (_.isPlainObject(left)) return (Object.keys(left).length == 0) == right
            }
            case 'isNotEmpty': {
                if (_.isString(left)) return (left != '') == right
                if (_.isArray(left)) return (left.length != 0) == right
                if (_.isPlainObject(left)) return (Object.keys(left).length != 0) == right
            }
            default:
                JS.throwError('OperatorDefError',null,null,[
                    ['zh-cn',`运算符 '${operator}' 不存在`],
                    ['en-us',`Invalid operator '${operator}'`]
                ],lang)
            }
    }
    catch (err) {
        JS.throwError('CompareError',err,null,[
            ['zh-cn',`比较运算失败`],
            ['en-us',`Failded to execute comparision`]
        ],lang)
    }
}
module.exports.compare = compare

/**
 * 把标签转成值
 * @param {string} tag 要转换的标签
 * @param {object} root 数据根目录
 * @param {object} parent 父对象
 * @param {object} self 自身对象
 * @param {string} lang 提示信息所用语言
 */
function tag2value(tag,root,parent,self,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    try {
        // 要取值的对象
        let target = null
        if (tag.indexOf('/') === 0) {
            let objName = tag.split('/')[1].split('.')[0]
            // 如果引用数据尚未填充，则扔回错误，提示查询后再比较
            // console.log(Object.keys(root))
            if (Object.keys(root).indexOf(objName) < 0) {
                JS.throwError('TagRefNotFilled',null,{
                    needRef: objName
                },[
                    ['zh-cn',`引用对象 /${objName} 尚未填充数据`],
                    ['en-us',`Reference /${objName} has no data filled`]
                ],lang)
            }
            // 这里允许了引用对象为 null 的情况，因为有可能会被用于 isNull 判断
            target = root[objName].data
        }
        else if (tag.indexOf('$') === 0) {
            // 父对象同样允许为 null 的情况，传过来的就可能是 null
            target = parent
        }
        else {
            // 既没有 / 也没有 $. 意味着是自身属性，不支持级联取值
            // 没有 self 对象，返回字面量
            if (self === null) return tag
            else return self[tag]
        }
        // 开始取值
        // 根据 .$. 符号判断取值类型
        let slices = tag.split('.$.')
        if (slices.length === 1) {
            // 没有 .$. 符号，意味着纯对象级联取值
            let pieces = tag.split('.')
            let val = target
            // 一级取值
            if (pieces.length === 1) return val
            // 多级取值
            for (let i=1; i<pieces.length; i++) {
                // 上一级对象类型判断
                if (!_.isPlainObject(val)) {
                    JS.throwError('TagDefError',null,null,[
                        ['zh-cn',`'${tag}' 标签里的 '${pieces[i-1]}' 不是 Object 类型`],
                        ['en-us',`'${pieces[i-1]}' in tag '${tag}' is not an Object`]
                    ],lang)
                }
                // 判断是否存在该值
                if (Object.keys(val).indexOf(pieces[i]) < 0) {
                    // console.log(pieces[i])
                    // 不是最后一级属性就报错，是最后一级则返回 {NotExist} 标签
                    if (i < pieces.length - 1) {
                        JS.throwError('TagDefError',null,null,[
                            ['zh-cn',`不存在 '${pieces[i]}' 属性`],
                            ['en-us',`'${pieces[i]}' property does not exist`]
                        ],lang)
                    }
                    else return '{NotExist}'
                }
                val = val[pieces[i]]
            }
            return val
        }
        else if (slices.length === 2) {
            // 注意 .$. 两端均不能为空
            if (slices[0] === '' || slices[1] === '') JS.throwError('TagDefError',null,null,[
                ['zh-cn',`'${tag}' 定义有误，'.$.' 符号两侧均不能为空字符串`],
                ['en-us',`'${tag}' is invalid，empty String is not allowed in both left and right sides around '.$.'`]
            ],lang)
            // 有 .$. 符号，且以 array 作为返回值，有效表达
            // 分两部分，左边依然有可能存在级联取值
            let pieces = slices[0].split('.')
            let val = target
            // 一级取值
            if (pieces.length === 1) return val
            // 多级取值
            for (let i=1; i<pieces.length; i++) {
                // 父对象类型判断
                if (!_.isPlainObject(val)) {
                    JS.throwError('TagDefError',null,null,[
                        ['zh-cn',`'${tag}' 标签里的 '${pieces[i-1]}' 不是 Object 类型`],
                        ['en-us',`'${pieces[i-1]}' in tag '${tag}' is not an Object`]
                    ],lang)
                }
                // 判断是否存在该值
                if (Object.keys(val).indexOf(pieces[i]) < 0) {
                    // 不是最后一级属性就报错，是最后一级则返回 {NotExist} 标签
                    if (i < pieces.length - 1) {
                        JS.throwError('TagDefError',null,null,[
                            ['zh-cn',`不存在 '${pieces[i]}' 属性`],
                            ['en-us',`'${pieces[i]}' property does not exist`]
                        ],lang)
                    }
                    else return '{NotExist}'
                }
                val = val[pieces[i]]
            }
            // 数组父对象取值完毕
            // 数组子属性取值不可继续级联
            if (slices[1].split('.').length > 1) {
                JS.throwError('TagDefError',null,null,[
                    ['zh-cn',`无法取得一个数组的级联子属性`],
                    ['en-us',`You can't aquire a cascaded property of an array`]
                ],lang)
            }
            // 针对 val 进行 pluck 取值
            if (!_.isArray(val)) {
                JS.throwError('TagDefError',null,null,[
                    ['zh-cn',`属性 '${pieces[pieces.length-1]}' 不是 Array 类型，无法进行子属性抽取`],
                    ['en-us',`You can't pick element properties from a non-array Object '${pieces[pieces.length-1]}'`]
                ],lang)
            }
            // 注意，由于此种情况多用于 in 查询，因此返回前进行了去重
            return _.uniq(_.map(val,slices[1]))
        }
        else JS.throwError('TagDefError',null,null,[
            ['zh-cn',`不支持多层 '.$.' 查询`],
            ['en-us',`Multiple '.$.' query is not supported`]
        ],lang)
    }
    catch (err) {
        JS.throwError('Tag2ValueError',err,null,[
            ['zh-cn',`标签转为值失败`],
            ['en-us',`Failed to convert tag '${tag}' to value`]
        ],lang)
    }
}
module.exports.tag2value = tag2value

/**
 * 对数据集进行取值运算
 * @param {array} list 数据集
 * @param {object} obj 操作描述结构体
 * @param {string} lang 提示信息所用语言
 */
function getValue(list,obj,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    try {
        let result = null
        // 检查是否有不支持的运算符
        if (JE.VALUES_OPS.indexOf(obj.operator) < 0) JS.throwError('OpDefError',null,null,[
            ['zh-cn',`values 定义有误，不支持 '${obj.operator}' 计算`],
            ['en-us',`values definition is invalid，calculation '${obj.operator}' is not supported`]
        ],lang)
        switch (obj.operator) {
            case 'count': {
                if (obj.fields === '*') return list.length
                let slices = obj.fields.split(',')
                if (slices.length > 1) JS.throwError('FieldsDefError',null,null,[
                    ['zh-cn',`'${obj.operator}' 运算只接受一个字段`],
                    ['en-us',`Calculation '${obj.operator}' accepts one filed only`]
                ],lang)
                result = 0
                _.forEach(list, (item) => {
                    // 有该属性且不为 null 才为有效计数
                    if (Object.keys(item).indexOf(obj.fields) >= 0 && !_.isNull(item[obj.fields])) result++ 
                })
                return result
            }
            case 'sum': {
                if (list.length === 0) return null
                let slices = obj.fields.split(',')
                if (slices.length > 1) JS.throwError('FieldsDefError',null,null,[
                    ['zh-cn',`'${obj.operator}' 运算只接受一个字段`],
                    ['en-us',`Calculation '${obj.operator}' accepts one filed only`]
                ],lang)
                return _.sumBy(list,obj.fields)
            }
            case 'avg': {
                if (list.length === 0) return null
                let slices = obj.fields.split(',')
                if (slices.length > 1) JS.throwError('FieldsDefError',null,null,[
                    ['zh-cn',`'${obj.operator}' 运算只接受一个字段`],
                    ['en-us',`Calculation '${obj.operator}' accepts one filed only`]
                ],lang)
                return _.meanBy(list,obj.fields)
            }
            case 'max': {
                if (list.length === 0) return null
                let slices = obj.fields.split(',')
                if (slices.length > 1) JS.throwError('FieldsDefError',null,null,[
                    ['zh-cn',`'${obj.operator}' 运算只接受一个字段`],
                    ['en-us',`Calculation '${obj.operator}' accepts one filed only`]
                ],lang)
                return _.maxBy(list,obj.fields)[obj.fields]
            }
            case 'min': {
                if (list.length === 0) return null
                let slices = obj.fields.split(',')
                if (slices.length > 1) JS.throwError('FieldsDefError',null,null,[
                    ['zh-cn',`'${obj.operator}' 运算只接受一个字段`],
                    ['en-us',`Calculation '${obj.operator}' accepts one filed only`]
                ],lang)
                return _.minBy(list,obj.fields)[obj.fields]
            }
            case 'first': {
                if (list.length === 0) return null
                let slices = obj.fields.split(',')
                if (slices.length > 1) JS.throwError('FieldsDefError',null,null,[
                    ['zh-cn',`'${obj.operator}' 运算只接受一个字段`],
                    ['en-us',`Calculation '${obj.operator}' accepts one filed only`]
                ],lang)
                else {
                    let item = list[0]
                    if (Object.keys(item).indexOf(obj.fields) < 0) JS.throwError('FieldsDefError',null,null,[
                        ['zh-cn',`'${obj.fields}' 字段不存在于第一条记录`],
                        ['en-us',`Field '${obj.fields}' doesn't exist in first row of records`]
                    ],lang)
                    else return item[obj.fields]
                }
            }
            case 'pick': {
                // 注意这个 pick 最特殊，它要返回空数组，因为它往往被用于 in 查询
                if (list.length === 0) return []
                let slices = obj.fields.split(',')
                if (slices.length > 1) JS.throwError('FieldsDefError',null,null,[
                    ['zh-cn',`'${obj.operator}' 运算只接受一个字段`],
                    ['en-us',`Calculation '${obj.operator}' accepts one filed only`]
                ],lang)
                return _.uniq(_.map(list,obj.fields))
            }
            case 'clone': {
                if (list.length === 0) return null
                let fields = []
                let slices = obj.fields.split(',')
                _.forEach(slices, (item) => {
                    if (item !== '') fields.push(item)
                })
                fields = _.uniq(fields)
                if (fields.indexOf('*') >= 0) fields = '*'
                result = []
                _.forEach(list, (item) => {
                    // 拷贝属性
                    let temp = {}
                    if (fields === '*') {
                        let keys = Object.keys(item)
                        _.forEach(keys, (key) => {
                            temp[key] = _.cloneDeep(item[key])
                        })
                    }
                    else {
                        _.forEach(fields, (field) => {
                            temp[field] = _.cloneDeep(item[field])
                        })
                    }
                    result.push(temp)
                })
                if (result.length === 0) result = null
                return result
            }
            default: {
                JS.throwError('OperatorDefError',null,null,[
                    ['zh-cn',`无效的运算符 '${obj.operator}'`],
                    ['en-us',`Invalid operator '${obj.operator}'`]
                ],lang)
            }
        }
    }
    catch (err) {
        JS.throwError('ValuesCalError',err,null,[
            ['zh-cn',`查询后取值失败`],
            ['en-us',`Getting value failed after query`]
        ],lang)
    }
}
module.exports.getValue = getValue
