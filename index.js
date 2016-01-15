/* 
* @Author: zyc
* @Date:   2016-01-15 14:32:12
* @Last Modified by:   zyc
* @Last Modified time: 2016-01-15 21:18:08
*/
'use strict';

const assert = require('assert');

const DBConnection = require('./connect');

class EntityDB {
  static setup(conString) {
    this.db = new DBConnection(conString);
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
    assert.ok(definition, 'definition required');
    assert.ok(definition.name, 'definition name required');
    this._definition = definition;
    this.name = definition.name;
  }

  dropTable() {
    return this.db.query(`DROP TABLE IF EXISTS "${this.name}" CASCADE`);
  }

  createTable() {
    const dataTypes = ['id SERIAL'];
    const attributes = this.definition.attributes;
    if (attributes) {
      for (let attr of attributes) {
        let dataTyp = `"${attr.name}" ${attr.type}`;
        if (attr.notNull) dataTyp += ` NOT NULL`;
        if (attr.default) dataTyp += ` DEFAULT ${attr.default}`;
        if (attr.unique) dataTyp += ` UNIQUE`;
        dataTypes.push(dataTyp);
      }
    }
    dataTypes.push(`CONSTRAINT ${this.name}_pkey PRIMARY KEY (id)`);
    return this.db.query(`CREATE TABLE "${this.name}"(${dataTypes.join(',')})`);
  }
};

module.exports = EntityDB;