const express = require('express');
const path = require('path');
require('dotenv').config();

// module use for express session
const session=require('express-session');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// the expression session for user login
app.use(session({
  secret: 'DOGWALKINGSERVICE_THEKEY',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');


app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;