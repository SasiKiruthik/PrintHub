function httpsEnforce(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') {
      const host = req.headers.host;
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
  }
  next();
}

module.exports = httpsEnforce;


