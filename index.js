/* 
* @Author: zyc
* @Date:   2016-01-15 14:32:12
* @Last Modified by:   zyc
* @Last Modified time: 2016-01-15 22:50:16
*/
'use strict';

const assert = require('assert');
const S = require('string');

const DBConnection = require('./connect');

class EntityDB {
  static setup(conString) {
    return this.db = new DBConnection(conString);
  }

  static define(definition) {
    assert.ok(this.db, 'call setup() first');
    return new EntityDB(this.db, definition);
  }

  constructor(db, definition) {
    this.db = db;
    this.definition = definition;
  }

  get db() {
    return this._db;
  }

  set db(db) {
    assert.ok(db, 'db required');
    if (typeof db  == 'string') {
      db = EntityDB.setup(db);
    }
    this._db = db;
  }

  get definition() {
    return this._definition;
  }

  set definition(definition) {
    if (typeof definition  == 'string') {
      definition = { name: definition };
    }
    assert.ok(definition, 'definition required');
    assert.ok(definition.name, 'definition name required');
    this._definition = definition;
    this.name = definition.name;
  }

  dropTable() {
    return this.db.query(`DROP TABLE IF EXISTS "${this.name}" CASCADE`);
  }

  createTable() {
    const dataTypes = [];
    const pkey = this.definition.pkey;
    if (pkey) {
      const key = S(pkey.name).underscore();
      dataTypes.push(`"${key}" ${pkey.type}`);
      dataTypes.push(`CONSTRAINT ${this.name}_pkey PRIMARY KEY (${key})`);
    }
    const attributes = this.definition.attributes;
    if (attributes) {
      for (let attr of attributes) {
        let dataTyp = `"${S(attr.name).underscore()}" ${attr.type}`;
        if (attr.notNull) {
          dataTyp += ` NOT NULL`;
        }
        if (attr.default != undefined) {
          dataTyp += ` DEFAULT '${attr.default}'`;
        }
        if (attr.unique) {
          dataTyp += ` UNIQUE`;
        }
        dataTypes.push(dataTyp);
      }
    }
    if (this.definition.timestamps) {
      dataTypes.push('created_at timestamp with time zone');
      dataTypes.push('updated_at timestamp with time zone');
    }
    return this.db.query(`CREATE TABLE "${this.name}"(${dataTypes.join(',')})`);
  }
};

module.exports = EntityDB;