const uuid = require('uuid');
const fs = require('fs');
const path = require('path');

module.exports = function(app) {
  const db = app.get('db');
  const logger = app.get('logger');

  // setup database
  db.serialize(() => {
    db.run('DROP TABLE IF EXISTS feeds;', (err, res) => { if (err) logger.error('drop table', err) });
    db.run('DROP TABLE IF EXISTS nodes;', (err, res) => { if (err) logger.error('drop table', err) });
    db.run('CREATE TABLE feeds (id VARCHAR(100) PRIMARY KEY NOT NULL, status TEXT NOT NULL, node TEXT, url VARCHAR(255) NOT NULL UNIQUE, color INTEGER, color_verified INTEGER);', (err, res) => { if (err) logger.error('create feeds table', err) });
    db.run('CREATE TABLE nodes (id TEXT PRIMARY KEY NOT NULL);', (err, res) => { if (err) logger.error('create nodes table', err) });

    let feeds = JSON.parse(fs.readFileSync(path.join(__dirname, '../output.json'), 'utf8'));
    let statement = db.prepare('INSERT INTO feeds (id, status, url) VALUES ($id, $status, $url);')
    for (let url in feeds) {
      statement.run({
        $id: uuid.v4(),
        $status: 'inactive',
        $url: feeds[url]
      }, (err) => {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            // logger.warn('duplicate url');
          } else {
            logger.error('add feed error', err)};
          }
      });
    }
    logger.info('init complete');
  });
}