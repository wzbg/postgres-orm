/* 
* @Author: zyc
* @Date:   2016-01-15 14:37:05
* @Last Modified by:   zyc
* @Last Modified time: 2016-01-15 15:58:32
*/
'use strict';

const pg = require('pg');

module.exports = class {
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
    return new Promise((resolve, reject) => {
      if (client) {
        client.query(queryString, values, (err, result) => {
          if(err) {
            return console.error('error running query', err);
          }
          console.log(result.rows[0].theTime);
          //output: Tue Jan 15 2013 19:12:47 GMT-600 (CST) 
          client.end();
        });
      } else {
        pg.connect(this.conString, (err, client, done) => {
          if (err) return reject(err);
          client.query(queryString, values, (err, result) => {
            done();
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
    });
  }
};