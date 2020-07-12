/**
 * 验证器，用于 JBDAP 处理过程中的参数合法性验证
 */

// 运行环境准备
const { JS, JE } = require('./global')

// 引入 xss 模块
const XSS = require('xss')
const options = {}
const xss = new XSS.FilterXSS(options)

// 引入 ajv 模块
const Ajv = require('ajv')
const ajv = new Ajv({ allErrors: true })

/**
 * 检查 JBDAP 的 json 指令是否合法
 * @param {Object} json 完整的 JBDAP 指令 json
 * @param {String} lang 提示信息所用语言
 */
function checkJSON(json,lang){
    // 默认语言
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // 规则
    let schema = {
        type: 'object',
        $defs: {
            command: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
                    },
                    type: {
                        type: 'string',
                        enum: [ 'list', 'entity', 'distinct', 'values', 'create', 'update', 'delete', 'increase', 'decrease', 'function' ],
                    },
                    return: {type: 'boolean' },
                    target: {
                        type: 'string',
                        pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
                    },
                    fields: {
                        if: { type: 'string' },
                        then: { minLength: 1 },
                        else: {
                            type: 'array',
                            minItems: 1,
                            uniqueItems: true,
                            items: {
                                if: { type: 'string' },
                                then: { minLength: 1 },
                                else: { $ref: '#/$defs/command' }
                            }
                        }
                    },
                    query: {
                        type: 'object',
                        properties: {
                            where: {
                                type: 'object'
                            },
                            order: {
                                if: { type: 'string' },
                                then: { minLength: 1 },
                                else: {
                                    type: 'array',
                                    uniqueItems: true,
                                    items: { type: 'string' }
                                }
                            },
                            size: {
                                type: 'number',
                                maximum: 1000,
                                minimum: 0
                            },
                            page: {
                                type: 'number',
                                minimum: 0
                            }
                        },
                        additionalProperties: false
                    },
                    data: {
                        if: { type: 'object' },
                        then: { minProperties: 1 },
                        else: {
                            type: 'array',
                            minItems: 1,
                            uniqueItems: true,
                            items: {
                                type: 'object',
                                minProperties: 1
                            }
                        }
                    },
                    onlyIf: {
                        type: 'object',
                        minProperties: 1
                    },
                    after: {
                        if: { type: 'array' },
                        then: {
                            minItems: 1,
                            uniqueItems: true,
                            items: {
                                $ref: '#/$defs/command'
                            }
                        },
                        else: { $ref: '#/$defs/command' }
                    }
                },
                required: [ 'name', 'type', 'target' ],
                additionalProperties: false
            }
        },
        properties: {
            security: { type: 'object' },
            needLogs: { type: 'boolean' },
            needTrace: { type: 'boolean' },
            isTransaction: { type: 'boolean' },
            language: {
                type: 'string',
                enum: [ 'zh-cn', 'en-us' ]
            },
            commands: {
                if: { type: 'array' },
                then: {
                    minItems: 1,
                    uniqueItems: true,
                    items: {
                        $ref: '#/$defs/command'
                    }
                },
                else: { $ref: '#/$defs/command' }
            }
        },
        required: [ 'commands' ],
        additionalProperties: false
    }
    // 执行校验
    let valid = ajv.validate(schema, json)
    // 处理错误信息
    if (!valid) {
        // 过滤掉 if 关键词的错误提示
        let errors = _.filter(ajv.errors,(err)=>{
            return err.keyword !== 'if'
        })
        // 按照数据路径分组
        let groups = {}
        _.each(errors,(item)=>{
            let key = 'json' + item.dataPath
            if (!groups[key]) groups[key] = []
            let msg = item.message
            // 补充报错信息
            if (item.keyword === 'additionalProperties') msg += ` '${item.params.additionalProperty}'`
            if (item.keyword === 'enum') msg += ` in ${JSON.stringify(item.params.allowedValues).replaceAll('","','|').replaceAll('"','')}`
            groups[key].push(msg)
        })
        let keys = _.sortBy(Object.keys(groups))
        let errorMessage = ''
        _.each(keys,(key)=>{
            errorMessage += `${key} : ${groups[key].join(', ')}; `
        })
        // TODO：这里还应该对 errorMessage 内部信息进行针对性替换，使得错误描述更容易理解
        errorMessage = errorMessage.replace('json.commands : should be object;','json.commands : should be object or array;')
                                   .replaceAll('fields : should be array;','fields : should be string or array;')
                                   .replaceAll('order : should be array;','order : should be string or array;')
                                   .replaceAll('data : should be array;','data : should be object or array;')
                                   .replaceAll('after : should be object;','after : should be object or array;')
        // 抛出错误
        JS.throwError('JSONError',null,{
            ajvErrors: errors
        },[
            ['zh-cn',`接收到的 json 参数有问题 <= ${errorMessage}`],
            ['en-us',`The json parameter is not valid <= ${errorMessage}`]
        ],lang)
    }
    else return true
}
module.exports.checkJSON = checkJSON

/**
 * 检查单个指令是否合法
 * @param {Object} cmd 单个指令
 * @param {String} lang 提示信息所用语言
 */
function checkCommand(cmd,lang){
    // 默认语言
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // 根据 command 类型检查其它字段
    let key = ''
    if (cmd.type === 'entity' || cmd.type === 'list' || cmd.type === 'values' || cmd.type === 'delete') {
        // 纯查询和删除命令不应该出现 data
        key = 'data'
        if (!_.isUndefined(cmd[key])) JS.throwError('CommandError',null,null,[
            ['zh-cn',`属性 '${key}' 不应该出现在 '${cmd.type}' 指令中`],
            ['en-us',`The '${key}' property should not exist in '${cmd.type}' type commands`]
        ],lang)
    }
    if (cmd.type === 'create' || cmd.type === 'update' || cmd.type === 'increase' || cmd.type === 'decrease') {
        // 增改命令必须有 data<object|array<object>>
        key = 'data'
        if (_.isUndefined(cmd[key])) JS.throwError('CommandError',null,null,[
            ['zh-cn',`在 '${cmd.type}' 命令中，属性 '${key}' 必须要配置`],
            ['en-us',`The '${key}' property is required in '${cmd.type}' type commands`]
        ],lang)
        // 更新（含增减）命令，data 必须是一个对象
        if (cmd.type === 'increase' || cmd.type === 'decrease' || cmd.type === 'update') {
            if (Object.prototype.toString.call(cmd[key]) !== '[object Object]') JS.throwError('CommandError',null,null,[
                ['zh-cn',`在 '${cmd.type}' 命令中，属性 '${key}' 必须是 Object 类型`],
                ['en-us',`The '${key}' property in '${cmd.type}' type commands must be an Object`]
            ],lang)
        }
        // 原子增减操作要求属性值必须是数字
        if (cmd.type === 'increase' || cmd.type === 'decrease') {
            // 检查值是否数字
            let valid = true
            let fails = []
            _.forEach(Object.keys(cmd.data), (key) => {
                if (!_.isNumber(cmd.data[key])) {
                    fails.push(key)
                    valid = false
                }
            })
            if (valid === false) JS.throwError('CommandError',null,null,[
                ['zh-cn',`字段 '${fails.join(',')}' 的值不是有效数字`],
                ['en-us',`Values of fields '${fails.join(',')}' are not numbers`]
            ],lang)
        }        
    }
    if (cmd.type === 'create' || cmd.type === 'update' || cmd.type === 'delete' || cmd.type === 'increase' || cmd.type === 'decrease' || cmd.type === 'function') {
        // 增改删和服务端函数命令不应该出现 fields
        key = 'fields'
        if (!_.isUndefined(cmd[key])) JS.throwError('CommandError',null,null,[
            ['zh-cn',`属性 '${key}' 不应该出现在 '${cmd.type}' 指令中`],
            ['en-us',`The '${key}' property should not exist in '${cmd.type}' type commands`]
        ],lang)
    }
    if (cmd.type === 'create' || cmd.type === 'function') {
        // 创建或者服务端函数命令中不应该出现 query
        key = 'query'
        if (!_.isUndefined(cmd[key])) JS.throwError('CommandError',null,null,[
            ['zh-cn',`属性 '${key}' 不应该出现在 '${cmd.type}' 指令中`],
            ['en-us',`The '${key}' property should not exist in '${cmd.type}' type commands`]
        ],lang)
    }
    if (cmd.type === 'values') {
        // 增改命令和服务端函数必须有 data
        key = 'fields'
        if (_.isUndefined(cmd[key])) JS.throwError('CommandError',null,null,[
            ['zh-cn',`在 '${cmd.type}' 命令中，属性 '${key}' 必须要配置`],
            ['en-us',`The '${key}' property is required in '${cmd.type}' type commands`]
        ],lang)
    }
    if (cmd.type === 'function') {
        // 服务端函数如果有 data 必须是 object 类型
        key = 'data'
        if (!_.isUndefined(cmd[key]) && !_.isPlainObject(cmd[key])) JS.throwError('CommandError',null,null,[
            ['zh-cn',`对于 'function' 操作，属性 'data' 必须是 Object 类型`],
            ['en-us',`Property 'data' must be an Object for 'function' type operations`]
        ],lang)
    }
    return true
}
module.exports.checkCommand = checkCommand

/**
 * 检查单个顶级命令是否合法
 * @param {object} cmd 单个命令
 * @param {string} lang 提示信息所用语言
 */
function checkTopCommand(cmd,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    checkCommand(cmd,lang)
    // 只有顶级指令需要指明是否 return
    // fields 下的级联查询肯定需要返回
    // after 下的级联操作无需返回
    let key = 'return'
    if (!_.isUndefined(cmd[key]) && !_.isBoolean(cmd[key])) JS.throwError('CommandError',null,null,[
        ['zh-cn',`属性 '${key}' 必须是 Boolean 类型`],
        ['en-us',`The '${key}' property must be a Boolean`]
    ],lang)
    return true
}
module.exports.checkTopCommand = checkTopCommand


/**
 * 对输入字符串进行防 xss 安全处理
 * @param {string} str 要处理的字符串
 */
function safeString(str) {
    if (!_.isString(str)) return str
    return xss.process(str)
}
module.exports.safeString = safeString

/**
 * 检查字符串是否存在 sql 注入
 * @param {string} str 要处理的字符串
 */
function hasSqlInjection(str) {
    if (!_.isString(str)) return false
    const sql = new RegExp("w*((%27)|('))((%6F)|o|(%4F))((%72)|r|(%52))", 'i')
    const sqlMeta = new RegExp("(%27)|(')|(--)|(%23)|(#)", 'i')
    const sqlMeta2 = new RegExp("(()|(=))[^\n]*((%27)|(')|(--)|(%3B)|(;))", 'i')
    const sqlUnion = new RegExp("((%27)|('))union", 'i')
    return sql.test(str) || sqlMeta.test(str) || sqlMeta2.test(str) || sqlUnion.test(str)
}
module.exports.hasSqlInjection = hasSqlInjection
