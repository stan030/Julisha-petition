const express = require('express');
const mongoose = require('mongoose');
const app = express();

const DATABASE_URL = 'mongodb://julisha_admin1:your_password@localhost:27017/julisha_db';

mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});