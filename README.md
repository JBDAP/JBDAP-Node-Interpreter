# JBDAP-Node-Interpreter
 
This package provides a series of functional tools to help developers to interpret a JBDAP-style-json object which is the first thing to write a JBDAP driver.

## Install

```
npm install --save jbdap-interpreter
```
or
```
yarn add jbdap-interpreter
```

## Usage

```
// import tools, set 'zh-cn' as default info language
const { parser, validator, reference, calculator } = require('jbdap-interpreter')('zh-cn')

// then you can use them in your code
validator.checkJSON(json)

```

## APIs

There are four modules here.

### 1. validator - help to check different kinds of parameters to see whether they are valid
  - checkJSON(json,lang) - validate whether a json object is a valid JBDAP-json
    - params
      - json - Object - target to validate
      - lang - String - the infomation langage, if not passed, use default.
    - return - Boolean
    - error - throw a NiceError object directly.
  - checkCommand(cmd,lang) - check whether a jbdap command object is valid
    - params
      - cmd - Object - target to check
      - lang - String - the infomation langage, if not passed, use default.
    - return - Boolean
    - error - throw a NiceError object directly.
  - checkTopCommand(cmd,lang) - just like checkCommand except we require this command to be a top level command
  - safeString(cmd,lang) - process a string to an xss-free one.
    - params
      - str - String - the string to be processed.
    - return - String - the new safe string
  - hasSqlInjection(cmd,lang) - check whether a string has sql injection dangers
    - params
      - str - String - the string to be checked
    - return - Boolean
### 2. parser - help to parse different kinds of configurations in JBDAP-style-json
  - parseComparision(type,key,value,lang) - parse a condition key-value-pair to a comparision structure
    - params
      - type - String - 'compare' for reference and 'query' for 'query.where'
      - key - String - the key of the condition key-value-pair
      - value - String|Any - the value of the condition key-value-pair
      - lang - String - the infomation langage, if not passed, use default.
    - return - Object
       ```
       // for example:
       {
           left: 'price',
           operator: 'gte',
           right: 150
       }
       ```
  - parseFields(fields,lang) - parse 'fields' property in JBDAP command
    - params
      - fields - String|Array[Object] - target to parse
      - lang - String - the infomation langage, if not passed, use default.
    - return - Object - parsed structure
      - raw - Array - the field names you want in a table
        ```
        // for example:
        [
            'id',
            'name',
            { lastVisited: 'updatedAt' },  // lastVisited is the alias of updatedAt
            ...
        ]
        ```
      - values - Array - the data you want to get in a 'values' type command
        ```
        // for example:
        [
            {
                name: 'userCount',
                operator: 'count',
                fields: 'id'
            },
            ...
        ]
        ```
      - cascaded - Array - the cascaded fields which have the same structure as a top query command
        ```
        // for example:
        [
            {
                name: 'top5blogs',
                type: 'list',
                target: 'blogs',
                fields: '*',
                query: {
                    where: {
                        'userId#eq': '$.id'
                    }
                }
            },
            ...
        ]
        ```
  - parseOrder(order,lang) - parse 'query.order' property in JBDAP command
    - params
      - order - String|Array[String] - target to parse
      - lang - String - the infomation langage, if not passed, use default.
    - return - Array - parsed structure
      ```
      // for example:
      [
          {
              column: 'updatedAt',
              order: 'desc'
          },
          {
              column: 'categoryId',
              order: 'asc'
          }
      ]
      ```
  - parseOffsetAndLimit(page,size,lang) - parse 'query.page' and 'query.size' to a structure
    - params
      - page - Integer - query.page
      - size - Integer - query.size
      - lang - String - the infomation langage, if not passed, use default.
    - return - Object
      ```
      // for example:
      {
          offset: 90,
          limit: 10
      }
      ```
### 3. calculator - do calculations for many places
  - checkCondition(type,obj,relation,root,parent,self,lang) - calculate the result of a condition object
    - params
      - type - String - 'compare' for 'onlyIf' structure and 'query' for 'query.where' in reference
      - obj - Object - the structure to calculate
      - relation - String - the relation between top properties, allows and|or|not
      - root - Object - the root data space
      - parent - Object - the node this calculation belongs to
      - self - the node data itself
      - lang - String - the infomation langage, if not passed, use default.
    - return - Boolean
  - compare(comparision,root,parent,self,lang) - calculate the result of a condition object
    - params
      - comparision - Object - the structure which has been parsed by `parser.parseComparision()`
      - root - Object - the root data space
      - parent - Object - the node this calculation belongs to
      - self - the node data itself
      - lang - String - the infomation langage, if not passed, use default.
    - return - Boolean
  - tag2value(tag,root,parent,self,lang) - convert a tag to value it presents
    - params
      - tag - String - the tag to convert
      - root - Object - the root data space
      - parent - Object - the node this calculation belongs to
      - self - the node data itself
      - lang - String - the infomation langage, if not passed, use default.
    - return - Any
  - getValue(list,obj,lang) - get a specified value from a data list, this is used in 'values' type command
    - params
      - list - Array[Object] - the source data list
      - obj - Object - the structure which is parsed by `parser.parseFields()`, the 'values' property works in here
      - lang - String - the infomation langage, if not passed, use default.
    - return - Any
### 4. reference - deal with the reference features
  - getObjFromObj(data,rawFields,lang) - get specified fields from data
    - params - Object - the source object
      - rawFields - Array[String|Object] - the structure which is parsed by `parser.parseFields()`, the 'raw' property works in here
      - lang - String - the infomation langage, if not passed, use default.
    - return - Object
  - getObjFromList(data,query,rawFields,root,parent,lang) - find one entity from a referenced data list, if there are many, take the first one
    - params
      - data - Array[Object] - the source data list
      - query - Object - a 'query' definition in JBDAP command
      - rawFields - Array[String|Object] - the fields structure which is parsed by `parser.parseFields()`, the 'raw' property works in here
      - root - Object - the root data space
      - parent - Object - the node this calculation belongs to
      - lang - String - the infomation langage, if not passed, use default.
    - return - Object
  - getListFromList(data,query,rawFields,root,parent,lang) - execute a query and fetch the ones which fits the specified condition
    - params
      - data - Array[Object] - the source data list
      - query - Object - a 'query' definition in JBDAP command
      - rawFields - Array[String|Object] - the fields structure which is parsed by `parser.parseFields()`, the 'raw' property works in here
      - root - Object - the root data space
      - parent - Object - the node this calculation belongs to
      - lang - String - the infomation langage, if not passed, use default.
    - return - Array[Object]
  - getValuesFromList(data,valuesFields,lang) - calculate the values you need from a data list, this is used by 'values' type command
    - params
      - data - Array[Object] - the source data list
      - valuesFields - Array[Object] - the fields structure which is parsed by `parser.parseFields()`, the 'values' property works in here

## Tips

It may be difficult to understand these functions, the repository https://github.com/JBDAP/JBDAP-Node-Sqlite can be helpful.

# Enjoy It!