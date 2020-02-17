// 运行环境准备
const { JE } = require('./lib/global')

module.exports = function(lang) {
    if (JE.LANGUAGES.indexOf(lang) >= 0) JE.i18nLang = lang
    else if (!_.isUndefined(lang)) console.warn(`language '${lang.toString()}' is not supported`)
    return {
        calculator: require('./lib/calculator'),
        parser: require('./lib/parser'),
        reference: require('./lib/reference'),
        validator: require('./lib/validator')
    }
}
