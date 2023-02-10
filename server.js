const path = require('path');
const http = require('http');
const dir = './Images/'
const fs = require('fs')

const express = require('express');
const socketio = require('socket.io');
const multer = require("multer");
const upload = multer({
  storage:multer.diskStorage({
    destination: './Images',
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
    }
  })
})
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const app = express();
const server = http.createServer(app);
const io = socketio(server);


// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';
let info = {}
app.get('/',(req,res)=>{
  console.log('new req')
  res.sendFile(__dirname+'/public/main.html')
})
app.post('/',upload.single('image'),(req,res)=>{
  req.on('data',data=>{
    splitted = data.toString('utf8').split('&')
    for(s of splitted){
      splitted2 = s.split('=')
      info[splitted2[0]] = splitted2[1]
    }
    console.log(info)
  })
  res.sendFile(__dirname+'/public/chat.html')
})
app.get('/upload.html',(req,res)=>{
 res.sendFile(__dirname+'/upload.html')
})


// Run when client connects
io.on('connection', socket => {
  const files = fs.readdirSync(dir)
  socket.emit('image',files)
  socket.on('joinRoom', () => {
    const user = userJoin(socket.id, info.username, info.room);
    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast.to(user.room).emit('message',formatMessage(botName, `${user.username} has joined the chat`));
 
    // Send users and room info
    io.to(user.room).emit('roomUsers', {room: user.room,users: getRoomUsers(user.room) });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });


  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit('message',formatMessage(botName, `${user.username} has left the chat`));
     // Send users and room info
      io.to(user.room).emit('roomUsers', {room: user.room,users: getRoomUsers(user.room)});
    }
  });
})


const PORT = process.env.PORT || 80;

server.listen(PORT, () => console.log(`Server running on port 80`))
