import express from 'express';
import bodyParser from 'body-parser';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';
import fs from 'fs'
const app = express();
const port = process.argv[2] || 3000;
const hostname = 'localhost'

const users = (()=>{
  try{
    return JSON.parse(fs.readFileSync('./users.json'))
  }catch(e){
    return []
  }
})()

app.use(bodyParser.json());
app.use(session({
  secret: '123456',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser((username, done) => {
  const user = users.find(u => u.username === username);
  done(null, user);
});

passport.use(new LocalStrategy(
  (username, password, done) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  }
));

app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  
  if (users.find(u => u.username === username)) {
    console.warn(`Username '${username}' already exists`);
    res.status(400).json({
      username,
      message: `Username '${username}' already exists`
    });
  } else {
    users.push({ username, password });
    console.info(`User '${username}' has been created`);
    res.status(201).json({
      username,
      message: `User '${username}' has been created`
    });
  }
});

app.post('/login', passport.authenticate('local'), (req, res) => {
  const token = Math.random().toString(36).substr(2, 20);
  req.session.token = token;
  req.session.username = req.user.username;
  console.info(`User ${req.user.username} authenticated`);

  const userIndex = users.findIndex(u => u.username === req.user.username);
  users[userIndex].token = token;
  res.json({ username: req.user.username, token, message: `User ${req.user.username} authenticated` });
});

app.get('/users/:username', (req, res) => {
  const { token } = req.body;
  const { username } = req.params;

  if (!token) {
    console.warn('Token is missing');
    res.status(400).json({
      message: 'Token is missing'
    });
  } else if (token && req.session.username !== username) {
    console.error(`Token '${token}' is invalid for user '${username}'`);
    res.status(400).json({
      username,
      message: `Token '${token}' is invalid for user '${username}'`
    });
  } else {
    console.info(`User '${username}' has been retrieved`);
    res.status(200).json({
      username,
      message: `User '${username}' has been retrieved`
    });
  }
});

app.post('/logout', (req, res) => {
  const { token } = req.body;
  const { username } = req.session;

  if (!token) {
    console.warn('Token is missing');
    res.status(200).json({
      message: 'Token is missing'
    });
  } else if (token && !username) {
    console.warn('No user is associated with this token');
  } else {
    const user = users.find(u => u.username === req.session.username);
    if (!user || req.session.token !== token) {
      console.warn('Token invalid');
      res.json({ message: 'Token invalid' });
    } else {
      console.info(`User ${user.username} logged out`);
      fs.writeFileSync('./users.json', JSON.stringify(users))
      req.session.destroy();
      res.status(200).json({ message: 'Logged out successfully' });
    }
  }
});

app.listen(port, hostname, ()=> console.log(`server is listing to port${port} follow the linke:http://${hostname}:${port}`))