const csp = (req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
};

module.exports = csp;
