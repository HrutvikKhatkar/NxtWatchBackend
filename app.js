const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

app.get('/user/', async (request, response) => {
  const userdataQuery = `
    select * from user
    `
  const result = await db.all(userdataQuery)
  response.send(result)
})

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  let hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    let createUserQuery = `
          INSERT INTO
            user (username, name, password, gender, location)
          VALUES
            (
              '${username}',
              '${name}',
              '${hashedPassword}',
              '${gender}',
              '${location}'
            )`
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const dbResponse = await db.run(createUserQuery)
      // const newUserId = dbResponse.lastID
      response.status(200)
      response.send(`User created successfully`)
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

// app.post('/login', async (request, response) => {
//   const {username, password} = request.body
//   const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
//   const dbUser = await db.get(selectUserQuery)
//   if (dbUser === undefined) {
//     response.status(400)
//     response.send('Invalid user')
//   } else {
//     const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
//     if (isPasswordMatched === true) {
//       response.send('Login success!')
//     } else {
//       response.status(400)
//       response.send('Invalid password')
//     }
//   }
// })
// app.post('/login', async (request, response) => {
//   const {username, password} = request.body
//   const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
//   const dbUser = await db.get(selectUserQuery)
//   if (dbUser === undefined) {
//     response.status(400)
//     response.send('Invalid User')
//   } else {
//     const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
//     if (isPasswordMatched === true) {
//       const payload = {
//         username: username,
//       }
//       const jwtToken = jwt.sign(payload, 'jwt_token')
//       response.send({jwtToken})
//     } else {
//       response.status(400)
//       response.send('Invalid Password')
//     }
//   }
// })
app.post('/login', async (request, response) => {
  try {
    const {username, password} = request.body
    const selectUserQuery = `SELECT * FROM user WHERE username = ?`
    const dbUser = await db.get(selectUserQuery, [username])
    if (dbUser === undefined) {
      response.status(400).send({ error: 'Invalid User' })
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
      if (isPasswordMatched) {
        const payload = { username }
        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET || 'your_secret_key')
        response.send({ jwtToken })
      } else {
        response.status(400).send({ error: 'Invalid Password' })
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    response.status(500).send({ error: 'Internal Server Error' })
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const selectUserQuery = `select * from user where username = "${username}" `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser) {
    const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)
    if (isPasswordMatched === true) {
      if (newPassword.length < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        let hashedPassword = await bcrypt.hash(newPassword, 10)
        const updateQuery = `update user set password = "${hashedPassword}" where username = "${username}"`
        const dbResponse = await db.run(updateQuery)
        // const newUserId = dbResponse.lastID
        response.status(200)
        response.send('Password updated')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})
module.exports = app
