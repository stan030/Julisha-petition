// Corrected server.js code

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/petition', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected.'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Petition API');
});

app.post('/sign', (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).send('Name and email are required.');
    }

    // Save petition signatory logic (mock)
    console.log(`Signature received: ${name}, ${email}`);
    res.status(200).send('Thank you for signing the petition!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});