/* 
* @Author: zyc
* @Date:   2016-01-15 21:20:44
* @Last Modified by:   zyc
* @Last Modified time: 2016-01-15 22:47:41
*/
'use strict';

const ORM = require('./index');

const conString = 'postgres://postgres:postgres@localhost/postgres';
ORM.setup(conString);

// const User = new ORM(conString, 'users'); // will match table with name 'users'
// const User = ORM.define('users'); // will match table with name 'users'
const User = ORM.define({
  name: 'users', // will match table with name 'users'
  pkey: {
    name: 'id',
    type: 'serial'
  },
  attributes: [{
    name: 'email',
    type: 'character varying',
    notNull: true,
    unique: true,
    default: ''
  }, {
    name: 'firstName',
    type: 'character varying'
  }, {
    name: 'lastName',
    type: 'character varying'
  }, {
    name: 'age',
    type: 'numeric',
    default: 0
  }, {
    name: 'birthday',
    type: 'date'
  }, {
    name: 'createdDate',
    type: 'timestamp with time zone'
  }],
  timestamps: true
});

// User.dropTable().then(res => console.log(res)).catch(err => console.error(err));

User.createTable().then(res => console.log(res)).catch(err => console.error(err));