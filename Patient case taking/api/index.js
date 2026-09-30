const app = require("../server");

module.exports = (req, res) => {
  // If Vercel rewrote the URL to /api, ensure req.url preserves the actual requested route
  if (req.headers["x-matched-path"] && req.url === "/api") {
    req.url = req.headers["x-matched-path"];
  }
  return app(req, res);
};
