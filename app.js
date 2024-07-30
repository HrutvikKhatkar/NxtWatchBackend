const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, 'userData.db');

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/');
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post('/login', async (request, response) => {
  try {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = ?`;
    const dbUser = await db.get(selectUserQuery, [username]);
    if (!dbUser) {
      response.status(400).send({ error: 'Invalid User' });
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched) {
        const payload = { username };
        const jwtToken = jwt.sign(payload, 'your_secret_key');
        response.send({ jwtToken });
      } else {
        response.status(400).send({ error: 'Invalid Password' });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    response.status(500).send({ error: 'Internal Server Error' });
  }
});

// Example of a protected route
app.get('/user', authenticateToken, async (request, response) => {
  const userdataQuery = 'SELECT * FROM user';
  const result = await db.all(userdataQuery);
  response.send(result);
});

function authenticateToken(request, response, next) {
  const authHeader = request.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return response.sendStatus(401);

  jwt.verify(token, 'your_secret_key', (err, user) => {
    if (err) return response.sendStatus(403);
    request.user = user;
    next();
  });
}

module.exports = app;
