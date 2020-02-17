const validator = require('../src/validator')

test('测试 checkJSON 方法', () => {
    // 整个参数不对
    let json = ''
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    json = []
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    // 缺 commands
    json = {}
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    // commands 数据类型不对
    json = {
        commands: ""
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    // commands 数组不能为空
    json = {
        commands: []
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    // security 类型不对
    json = {
        security: 123
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(2)
    }
    // needLogs 类型不对
    json = {
        needLogs: "true"
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(2)
    }
    // isTransaction 类型不对
    json = {
        isTransaction: 1
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(2)
    }
    // 完全正常
    json = {
        needLogs: false,
        isTransaction: false,
        commands: [
            {
                name: '',
            }
        ]
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(3)
    }
    json = {
        securit: {},
        needLog: false,
        isTransaction: false,
        commands: [
            {}
        ]
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(5)
    }
    json = {
        commands: [
            []
        ]
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(err.fullInfo())
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    json = {
        commands: {
            name: 'test',
            type: 'faketype',
            target: 'test'
        }
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(JSON.stringify(err.fullInfo()))
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    json = {
        commands: {
            name: "test",
            type: "list",
            target: "User",
            onlyIf: {},
            after: null
        }
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(JSON.stringify(err.fullInfo()))
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(2)
    }
    json = {
        commands: {
            name: "test",
            type: "list",
            target: "User",
            query: []
        }
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(JSON.stringify(err.fullInfo()))
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    json = {
        commands: {
            name: "test",
            type: "list",
            target: "User",
            query: {},
            fields: {}
        }
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(JSON.stringify(err.fullInfo()))
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    json = {
        commands: {
            name: "test",
            type: "list",
            target: "User",
            query: {},
            fields: ''
        }
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(JSON.stringify(err.fullInfo()))
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
    json = {
        commands: {
            name: "test",
            type: "list",
            target: "User",
            query: {},
            fields: ''
        }
    }
    try {
        validator.checkJSON(json)
    }
    catch (err) {
        // console.log(err.fullMessage())
        // console.log(JSON.stringify(err.fullInfo()))
        expect(err.name).toBe('JSONError')
        expect(err.fullInfo().ajvErrors.length).toEqual(1)
    }
});

test('测试 checkCommand 方法', () => {
    // data 多余
    let json = {
        name: "test",
        type: "list",
        target: "User",
        query: {},
        fields: "*",
        data: {}
    }
    try {
        validator.checkCommand(json)
    }
    catch (err) {
        expect(err.name).toBe('CommandError')
        expect(err.fullMessage()).toMatch(/data/)
    }
    // fields 多余
    json = {
        name: "test",
        type: "create",
        target: "User",
        query: {},
        fields: [],
        data: {
            a: 0
        }
    }
    try {
        validator.checkCommand(json)
    }
    catch (err) {
        // console.log(err)
        expect(err.name).toBe('CommandError')
        expect(err.fullMessage()).toMatch(/fields/)
    }
    // query 不应该出现在 create 中
    json = {
        name: "test",
        type: "create",
        target: "User",
        return: true,
        query: {},
        data: {
            a: 0
        }
    }
    try {
        validator.checkCommand(json)
    }
    catch (err) {
        expect(err.name).toBe('CommandError')
        expect(err.fullMessage()).toMatch(/query/)
    }
    // 缺 data
    json = {
        name: "test",
        type: "create",
        target: "User"
    }
    try {
        validator.checkCommand(json)
    }
    catch (err) {
        expect(err.name).toBe('CommandError')
        expect(err.fullMessage()).toMatch(/data/)
    }
    // data 类型不对
    json = {
        name: "test",
        type: "create",
        target: "User",
        data: null
    }
    try {
        validator.checkCommand(json)
    }
    catch (err) {
        expect(err.name).toBe('CommandError')
        expect(err.fullMessage()).toMatch(/data/)
    }
    // 正常的 list 查询
    json = {
        name: "test",
        type: "list",
        target: "User",
        query: {},
        fields: "*"
    }
    expect(validator.checkCommand(json)).toBe(true)
    // 正常的 values 查询
    json = {
        name: "test",
        type: "values",
        target: "User",
        query: {},
        fields: [
            "*"
        ]
    }
    expect(validator.checkCommand(json)).toBe(true)
    // 正常的 create
    json = {
        name: "test",
        type: "create",
        target: "User",
        data: {
            v1: "",
            v2: ""
        }
    }
    expect(validator.checkCommand(json)).toBe(true)
    // 正常的 delete
    json = {
        name: "test",
        type: "delete",
        target: "User",
        query: {
            where: {}
        }
    }
    expect(validator.checkCommand(json)).toBe(true)
});

test('测试 checkTopCommand 方法', () => {
    let json = []
    // return 类型不对
    json = {
        name: "test",
        type: "create",
        target: "User",
        return: 1,
        data: {
            a: 0
        }
    }
    try {
        validator.checkTopCommand(json)
    }
    catch (err) {
        // console.log(err)
        expect(err.name).toBe('CommandError')
        expect(err.fullMessage()).toMatch(/return/)
    }
    json = {
        name: "test",
        type: "create",
        target: "User",
        return: false,
        data: {
            a: 0
        }
    }
    expect(validator.checkTopCommand(json)).toEqual(true)
    json = {
        name: "test",
        type: "create",
        target: "User",
        data: {
            a: 0
        }
    }
    expect(validator.checkTopCommand(json)).toEqual(true)
})

test('测试 safeString 方法', () => {
    // 传入 undefined
    expect(validator.safeString(undefined)).toEqual(undefined)
    // 传入有威胁的字符
    expect(validator.safeString(`<h1 id="title">XSS Demo</h1>
<p class="text-center">
Sanitize untrusted HTML (to prevent XSS) with a configuration specified by a Whitelist.
</p>
<form>
    <input type="text" name="q" value="test">
    <button id="submit">Submit</button>
</form>
<pre>hello</pre>
<p>
    <a href="http://jsxss.com">http</a>
    <a href="https://jsxss.com">https</a>
    <a href="ftp://jsxss.com">ftp</a>
    <a href="other1">other1</a>
    <a href="/other2">other2</a>
    <a href="#">other3</a>
</p>
<h3>Features:</h3>
<ul>
    <li>Specifies HTML tags and their attributes allowed with whitelist</li>
    <li>Handle any tags or attributes using custom function</li>
</ul>
<script type="text/javascript">
alert(/xss/);
</script>`)).toEqual(`<h1>XSS Demo</h1>
<p>
Sanitize untrusted HTML (to prevent XSS) with a configuration specified by a Whitelist.
</p>
&lt;form&gt;
    &lt;input type="text" name="q" value="test"&gt;
    &lt;button id="submit"&gt;Submit&lt;/button&gt;
&lt;/form&gt;
<pre>hello</pre>
<p>
    <a href="http://jsxss.com">http</a>
    <a href="https://jsxss.com">https</a>
    <a href>ftp</a>
    <a href>other1</a>
    <a href="/other2">other2</a>
    <a href="#">other3</a>
</p>
<h3>Features:</h3>
<ul>
    <li>Specifies HTML tags and their attributes allowed with whitelist</li>
    <li>Handle any tags or attributes using custom function</li>
</ul>
&lt;script type="text/javascript"&gt;
alert(/xss/);
&lt;/script&gt;`)

})

test('测试 hasSqlInjection 方法', () => {
    // 传入 undefined
    expect(validator.hasSqlInjection(undefined)).toEqual(false)
    let str = 'alert tcp $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (msg:"SQL Injection - Paranoid"; flow:to_server,established;uricontent:".pl";pcre:"/(%27)|(\')|(--)|(%23)|(#)/i"; classtype:Web-application-attack; sid:9099; rev:5;)'
    expect(validator.hasSqlInjection(str)).toEqual(true)
})
