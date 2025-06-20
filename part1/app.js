var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// database module follow starthere files
var mysql = require('mysql2/promise');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// same set up as starthere
let db;

(async () => {
    try {
        // get connection and check if the database exist
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
        await connection.end();

        // egt connection again and start to add tables
        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'DogWalkService'

        });
        await db.execute(`
        CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await db.execute(`
        CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        size ENUM('small', 'medium', 'large') NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);

        await db.execute(`
        CREATE TABLE IF NOT EXISTS WalkRequests(
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT NOT NULL,
        requested_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      )
    `);


        await db.execute(`
        CREATE TABLE IF NOT EXISTS WalkApplications(
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        CONSTRAINT unique_application UNIQUE (request_id, walker_id)
      )
    `);

        await db.execute(`
        CREATE TABLE IF NOT EXISTS WalkRatings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        owner_id INT NOT NULL,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comments TEXT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id),
        UNIQUE (request_id)
      )
    `);

        // clear table for everytime
        await db.execute('DELETE FROM WalkRatings');
        await db.execute('DELETE FROM WalkApplications');
        await db.execute('DELETE FROM WalkRequests');
        await db.execute('DELETE FROM Dogs');
        await db.execute('DELETE FROM Users');

        // insert table data
        await db.execute(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('jason123', 'jason@hotmail.com', 'hashed234', 'walker'),
        ('jack123', 'jack@hotmail.com', 'hashed678', 'owner')
    `);


        await db.execute(`
        INSERT INTO Dogs (owner_id,name,size) VALUES
        ((SELECT user_id FROM Users WHERE username='alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username='alice123'), 'Big Max', 'large'),
        ((SELECT user_id FROM Users WHERE username='carol123'), 'Bella', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'jason123'), 'Toby', 'large'),
        ((SELECT user_id FROM Users WHERE username = 'jack123'), 'Jedi', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'bobwalker'), 'Bob', 'large')
    `);


        await db.execute(`INSERT INTO WalkRequests (dog_id,requested_time,duration_minutes,location,status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name='Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name='Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Bob'), '2025-06-10 10:30:00', 60, 'King Ave', 'completed'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Toby'), '2025-06-10 11:30:00', 75, 'First Ave', 'cancelled'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Jedi'), '2025-06-10 12:30:00', 90, 'City Park', 'open')

    `);

        await db.execute(`INSERT INTO WalkRatings (request_id,walker_id,owner_id,rating,comments) VALUES (
        (SELECT request_id FROM WalkRequests WHERE dog_id=(SELECT dog_id FROM Dogs WHERE name='Bob')),
        (SELECT user_id FROM Users WHERE username='bobwalker'),
        (SELECT user_id FROM Users WHERE username = 'bobwalker'),
        5,'no comments')
    `);
        console.log('Database setup');
    } catch (err) {
        console.error('setup failed', err);

    }
})();

// Return a list of all dogs with their size and owner's username.
app.get('/api/dogs', async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d JOIN Users u ON d.owner_id = u.user_id
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'api failed' });
    }
});

// Return all open walk requests,
// including the dog name, requested time, location, and owner's username.

app.get('/api/walkrequests/open', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT w.request_id, d.name AS dog_name,
            w.requested_time, w.duration_minutes, w.location, u.username AS owner_username
            FROM WalkRequests w
            JOIN Dogs d ON w.dog_id = d.dog_id
            JOIN Users u ON d.owner_id = u.user_id
            WHERE w.status = 'open'
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'api failed for walk requests' });
    }
});


app.get('/api/walkers/summary', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT u.username AS walker_username, COUNT(wr.rating_id) AS total_ratings,
            ROUND(AVG(wr.rating),1) AS average_rating,

            (SELECT COUNT(*) FROM WalkRequests JOIN WalkRatings wr ON wr.request_id =req.request_id
            WHERE wr.walker_id =u.user_id AND req.status ='completed') AS completed_walks

            FROM Users u LEFT JOIN WalkRatings wr ON wr.walker_id = u.user_id
            WHERE u.role='walker'
            GROUP BY u.user_id
            `);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'api failed for summary requests' });
    }
});



app.use(express.static(path.join(__dirname, 'public')));








app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
