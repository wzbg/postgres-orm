/* 
* @Author: zyc
* @Date:   2016-01-15 14:32:12
* @Last Modified by:   zyc
* @Last Modified time: 2016-01-17 03:22:47
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
      definition = {
        name: definition,
        pkey: {
          name: 'id',
          type: 'serial'
        }
      };
    }
    assert.ok(definition, 'definition required');
    assert.ok(definition.name, 'definition name required');
    this._definition = definition;
    this.name = definition.name;
    this.timestamps = definition.timestamps;
    const pkey = this.definition.pkey;
    if (pkey) {
      this.pkey = pkey;
      assert.ok(pkey.name, 'pkey name required');
      this.key = S(pkey.name).underscore();
    }
  }

  dropTable() {
    return this.db.query(`DROP TABLE IF EXISTS "${this.name}" CASCADE`);
  }

  createTable() {
    const dataTypes = [];
    const pkey = this.pkey;
    if (pkey) {
      dataTypes.push(`"${this.key}" ${pkey.type}`);
      dataTypes.push(`CONSTRAINT ${this.name}_pkey PRIMARY KEY (${this.key})`);
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
    if (this.timestamps) {
      dataTypes.push('created_at timestamp with time zone');
      dataTypes.push('updated_at timestamp with time zone');
    }
    return this.db.query(`CREATE TABLE "${this.name}"(${dataTypes.join(',')})`);
  }

  save(entity) {
    assert.ok(entity, 'null entity cannot be saved');
    return entity[this.key] ? this.update(entity) : this.create(entity);
  }

  create(entity) {
    assert.ok(entity, 'null entity cannot be created');
    if (this.pkey && this.pkey.type.toLowerCase() == 'serial') {
      delete entity[this.key];
    }
    const fields = [], params = [], values = [];
    for (let attr in entity) {
      fields.push(`"${S(attr).underscore()}"`);
      values.push(entity[attr]);
      params.push(`$${values.length}`);
    }
    if (this.timestamps) {
      fields.push(`"created_at"`);
      values.push(new Date());
      params.push(`$${values.length}`);
      fields.push(`"updated_at"`);
      values.push(new Date());
      params.push(`$${values.length}`);
    }
    const queryString = `INSERT INTO "${this.name}"(${fields.join(',')}) VALUES(${params.join(',')}) RETURNING id`;
    return new Promise((resolve, reject) => this.db.query(queryString, values)
      .then(res => resolve(res[0].id)).catch(err => reject(err)));
  }

  update(entity, condition) {
    assert.ok(entity, 'null entity cannot be updated');
    const params = [], values = [];
    for (let attr in entity) {
      if (attr == this.key) continue;
      values.push(entity[attr]);
      params.push(`"${S(attr).underscore()}" = $${values.length}`);
    }
    if (this.timestamps) {
      values.push(new Date());
      params.push(`"updated_at" = $${values.length}`);
    }
    const conditions = [];
    if (condition) {
      for (let attr in condition) {
        values.push(condition[attr]);
        conditions.push(`"${S(attr).underscore()}" = $${values.length}`);
      }
    } else {
      values.push(entity[this.key]);
      conditions.push(`${this.key} = $${values.length}`);
    }
    const queryString = `UPDATE "${this.name}" SET ${params.join(',')} WHERE ${conditions.join(' AND ')} RETURNING *`;
    return new Promise((resolve, reject) => this.db.query(queryString, values)
      .then(res => resolve(this.dbToJS(condition ? res : res[0])))
      .catch(err => reject(err)));
  }

  load(entity) {
    if (typeof entity  != 'object') {
      entity = { id: entity };
    }
    return new Promise((resolve, reject) => this.list({ filter: entity })
      .then(res => resolve(res.length ? res[0] : {}))
      .catch(err => err => reject(err))
    );
  }

  list(query) {
    let queryString = `SELECT * FROM "${this.name}"`;
    const params = [], values = [];
    if (query) {
      const { filter, sort, offset, limit } = query;
      for (let attr in filter) {
        values.push(filter[attr]);
        params.push(`"${S(attr).underscore()}" = $${values.length}`);
      }
      if (params.length) {
        queryString += ` WHERE ${params.join(' AND ')}`;
      }
      if(sort) {
        let sorts = [];
        for(let attr in sort) {
          let sortStmt = ` "${S(attr).underscore()}"`;
          if(sort[attr] && sort[attr].toLowerCase() == 'desc') {
            sortStmt += ' DESC';
          }
          sorts.push(sortStmt);
        }
        if(sorts.length) {
          queryString += ` ORDER BY ${sorts.join(',')}`;
        }
      }
      if(offset) {
        values.push(offset);
        queryString += ` OFFSET $${values.length}`;
      }
      if(limit) {
        values.push(limit);
        queryString += ` LIMIT $${values.length}`;
      }
    }
    return new Promise((resolve, reject) => this.db.query(queryString, values)
      .then(res => resolve(this.dbToJS(res))).catch(err => reject(err)));
  }

  count(entity) {
    let queryString = `SELECT COUNT(*) FROM "${this.name}"`;
    const params = [], values = [];
    for (let attr in entity) {
      values.push(entity[attr]);
      params.push(`"${S(attr).underscore()}" = $${values.length}`);
    }
    if (params.length) {
      queryString += ` WHERE ${params.join(' AND ')}`;
    }
    return new Promise((resolve, reject) => this.db.query(queryString, values)
      .then(res => resolve(res[0].count)).catch(err => reject(err)));
  }

  delete(entity) {
    let queryString = `DELETE FROM "${this.name}"`;
    const params = [], values = [];
    for (let attr in entity) {
      values.push(entity[attr]);
      params.push(`"${S(attr).underscore()}" = $${values.length}`);
    }
    if (params.length) {
      queryString += ` WHERE ${params.join(' AND ')}`;
    }
    return this.db.query(queryString, values);
  }

  dbToJS(dbEntity) {
    if (!dbEntity) return;
    if (dbEntity instanceof Array) {
      return dbEntity.map(entity => this.dbToJS(entity));
    }
    const jsEntity = {};
    for (let attr in dbEntity) {
      jsEntity[S(attr).camelize()] = dbEntity[attr];
    }
    return jsEntity;
  }
};

module.exports = EntityDB;