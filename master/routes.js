
module.exports = function (app) {
  const logger = app.get('logger');
  const db = app.get('db');
  const io = app.get('io');
  
  require('./scrape')(app);

  app.get('/start', (req, res) => {
    logger.info('start feeds');
    db.each('SELECT * FROM feeds WHERE status=\'inactive\' LIMIT 10;', (err, res) => {
      if (err) logger.error('get feed', err)
      else io.emit('init_feed', res);
      console.dir(res);
    });
    res.send();
  });

  app.get('/status', (req, res) => {
    db.all('SELECT * FROM feeds', (err, data) => {
      if (err) logger.error('select all feeds', err);
      res.json(data);
    });
  });
}