/**
 * JBDAP 运行环境准备
 */

// 开发环境准备，即 global.$JBDAP_SYS，来自 jbdap-global 模块
if (!global.JBDAP_GLOBAL_OK) require('jbdap-global')
let JS = global.$JBDAP_SYS

// 将 lodash 全局化
global._ = require('lodash')

// JBDAP 运行环境配置准备
if (!global.$JBDAP_ENV) global.$JBDAP_ENV = {
    i18nLang: 'zh-cn'     // 运行环境默认语言
}
let JE = global.$JBDAP_ENV

// 定义支持的语言列表
JE.LANGUAGES = [
    'zh-cn',
    'en-us'
]

// 定义全部支持的比较运算符
JE.COMPARE_OPS = [
    'eq',
    'ne',
    'gte',
    'gt',
    'lte',
    'lt',
    'in',
    'notIn',
    'contains',
    'doesNotContain',
    'startsWith',
    'doesNotStartWith',
    'endsWith',
    'doesNotEndWith',
    'matches',
    'doesNotMatch',
    'exists',
    'doesNotExist',
    'isNull',
    'isNotNull',
    'isUndefined',
    'isNotUndefined',
    'isEmpty',
    'isNotEmpty'
]
JE.QUERY_OPS = [
    'eq',
    'ne',
    'gte',
    'gt',
    'lte',
    'lt',
    'in',
    'notIn',
    'between',
    'notBetween',
    'like',
    'notLike',
    'contains',
    'doesNotContain',
    'startsWith',
    'doesNotStartWith',
    'endsWith',
    'doesNotEndWith',
    'isNull',
    'isNotNull'
]
JE.VALUES_OPS = [
    'count',
    'sum',
    'avg',
    'max',
    'min',
    'first',
    'pick',
    'clone'
]

// 全局抛错函数
JS.throwError = function (name,cause,info,dict,lang) {
    // 默认语言
    if (lang == undefined) lang = JE.i18nLang
    JS.throwErrorI18N(name,cause,info,dict,lang)
}

module.exports.JS = JS
module.exports.JE = JE
