module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'Serverless function works!',
    path: req.url,
    method: req.method
  });
};
