/* 
* @Author: zyc
* @Date:   2016-01-15 14:37:05
* @Last Modified by:   zyc
* @Last Modified time: 2016-01-20 01:22:46
*/
'use strict';

const pg = require('pg');

class DBConnection {
  constructor(conString) {
    this.conString = conString;
  }

  get client() {
    return new pg.Client(this.conString);
  }

  end(client) {
    if (client) client.end();
    pg.end();
  }

  query(queryString, values, client) {
    console.log(queryString, values);
    return new Promise((resolve, reject) => {
      if (client) {
        client.query(queryString, values, (err, result) => {
          if (err) return reject({queryString, values, err});
          resolve(result.rows.length ? result.rows : result.rowCount);
        });
      } else {
        pg.connect(this.conString, (err, client, done) => {
          if (err) return reject(err);
          client.query(queryString, values, (err, result) => {
            done();
            if (err) return reject({queryString, values, err});
            resolve(result.rows.length ? result.rows : result.rowCount);
          });
        });
      }
    });
  }
};

module.exports = DBConnection;