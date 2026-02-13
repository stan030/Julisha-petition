const express = require('express');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Deprecated req.connection logic replaced
app.use((req, res, next) => {
  req.socket = req.connection; // Ensure to use req.socket instead of req.connection
  next();
});

// Sample route
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

http.createServer(app).listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
