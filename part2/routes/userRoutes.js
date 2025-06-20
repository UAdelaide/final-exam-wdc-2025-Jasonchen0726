const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});






// POST login (dummy version)


// router for user login
// it get the data from the request
// then it run sql commands to check within the database
// if the request body is matched within the database
// it will get the row data including fields like user_id....
// then store the data in the session and send the response
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query(`
      SELECT user_id, username, role FROM Users
      WHERE username = ? AND password_hash = ?
    `, [username, password]);

    if (rows.length === 0) {
      console.log('Invalid login attempt for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = {
      id: rows[0].user_id,
      username: rows[0].username,
      role: rows[0].role
    };

    res.json({ message: 'Login successful', user: req.session.user });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// router for user log out
// use for both web pages
// from the frontend requests
// it destroy the session
// erases the cookie data
// returns to the login form.

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});


// router for user's dogs
// for owners
// it first check the session of the current login user
// if ok, it get current login user's owner_id from the session
// and run sql query 


router.get('/mydogs', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'not login in' });
  }
  const ownerId = req.session.user.id;
  try {
    const [dogs] = await db.query('SELECT dog_id, name FROM Dogs WHERE owner_id = ?', [ownerId]);
    res.json(dogs);
  } catch (err) {
    res.status(500).json({ error: 'fail to get dogs' });
  }
});



router.get('/getdogs', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT dog_id, name, size,  owner_id FROM Dogs');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'api failed' });
  }
});



module.exports = router;