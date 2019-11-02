const path       = require('path');
const http       = require('https');
const express    = require('express'); 
const bodyParser = require('body-parser');
const socketIO   = require('socket.io');
const fs         = require('fs');
const jwt        = require("jsonwebtoken");
const mongoose   = require('mongoose');
var _static = require('node-static');
var file = new _static.Server('./static', {
    cache: false
});
var options = {
    key: fs.readFileSync('fake-keys/key.pem'),
    cert: fs.readFileSync('fake-keys/cert.pem')
};

//Configuring db
var mongoDB = 'mongodb://127.0.0.1/chat_system';
mongoose.connect(mongoDB, { useNewUrlParser: true });

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//Model starts here
const user_login = require('./model/user_login');

const { generateMessage, generateLoactionMessage, generateImageMessage } = require('./utils/message');
const common_method = require('./utils/common');

const publicPath = path.join(__dirname, "../public");
const port = process.env.PORT || 3000;

var app    = express();
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(publicPath));
var server = http.createServer(options, app);
//Client Api Start
app.post('/checkLogin', function(req, res, next) {
    var integerValue = req.body.email;
    if(isNaN(req.body.email)) {
        integerValue = 0;
    } 
    req.body.email = req.body.email.toLowerCase();
    user_login.find({ $and: [ { $or:[ { 'email':req.body.email }, {'mobile': integerValue } ] }, { "password" : req.body.password } ] }, function(err, users) {
        if (err) {
            res.send(common_method.getStatusCode("400"));return;
        } else {
            if (users != undefined && users.length == 0) {
                res.json(common_method.getStatusCode(413));return;
            } else {
                const user = {
                    user_id           : users[0]._id,
                    user_name         : users[0].user_name,
                    user_email        : users[0].email,
                    user_mobile       : users[0].mobile
                };
                jwt.sign({ user }, 'seceratkey', { expiresIn: "5h" }, (err, token) => {
                    let result = common_method.getStatusCode("200", "Login Successfull");
                    result['data']  = user;
                    result['token'] = token;
                    res.json(result);
                });   
            }
        }
    });
});

app.post('/insertClient', function(req, res, next) {
    let result = {};
    req.body.email = req.body.email.toLowerCase();
    user_login.find({ $or:[ { 'email':req.body.email }, {'mobile': req.body.mobile} ]}, function(err, users){
        if (err) {
            res.send(common_method.getStatusCode("400"));return;
        }
        if(users != undefined && users.length == 0) {
            var newUser = new user_login(req.body);
            newUser._id = mongoose.Types.ObjectId();
            newUser.is_approved = 0;
            newUser.save(function(err) {
                if (err) {
                    res.send(common_method.getStatusCode("400", "", err));return;
                }
                const user = {
                    user_id           : newUser._id,
                    user_name         : req.body.user_name,
                    user_email        : newUser.email,
                    user_mobile       : newUser.mobile
                }
                jwt.sign({ user }, 'seceratkey', { expiresIn: "5h" }, (err, token) => {
                    let result = common_method.getStatusCode("200", "Registration Successfull. You will be able to login after approval from admin.");
                    result['data']  = user;
                    result['token'] = token;
                    res.json(result);return;
                });
            });
        } else {
            if(users[0]["email"] == req.body.email) {
                res.json(common_method.getStatusCode(410));return;
            } else if(users[0]["mobile"] == req.body.mobile){
                res.json(common_method.getStatusCode(411));return;
            } else {
                res.json(common_method.getStatusCode(400));return;
            }
        }
    });
});

let _io;
const MAX_CLIENTS = 3;
var io     = socketIO(server);
var clients = io.sockets.clients();
io.on('connection', (socket) => {

  	const rooms = io.nsps['/'].adapter.rooms;

	//console.log('New user connected');

	socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app.'));

	socket.broadcast.emit('newMessage', generateMessage('Admin', 'New user has joined the chat.'));

	socket.on('createMessage', (message, callback) => {
		socket.broadcast.emit('newMessage', generateMessage(message.from, message.text));
		socket.emit('newMessage', generateMessage('mysqlf', message.text));
		if(callback) return callback('This is from the server');
	});

	socket.on('messagePersonal', (data, callback) => {
		for(var dataObj in clients['user_ids']) {
			if(dataObj != data.username) {
				console.log(clients['user_ids'][dataObj] + " >>>> " + data.username);
				var socketId = clients['user_ids'][dataObj]['socket'];
				if(io.sockets.sockets[socketId]!=undefined) {
					io.sockets.connected[socketId].emit("newMessage", generateMessage(data.username, data.username + " trying to connect to you"));
				} else {
					console.log("deleted " + dataObj);
                    delete clients['user_ids'][dataObj];
				}
			}
		}
		if(callback) return callback('Pesonal Message send successfully.');
	});

	socket.on('add-user', function(data){
		console.log("User Added " + data.username + "; Socket_id " + socket.id);
		if(clients['user_ids'] == undefined){
			clients['user_ids'] = [];
		}
	    clients['user_ids'][data.username] = {
	      	"socket": socket.id
	    };
	});

	socket.on('createImage', (message, callback) => {

		let imageData    = message.text;
		let fileContent  =  imageData.split(',')[1];
		let nowDate      = Date.now();
		let tempFileName =  (imageData.split(',')[0]).toLowerCase().replace("data:image/", "").replace(";base64", "");
 		let filePath     =  path.resolve(publicPath, "images", nowDate + "." + tempFileName);
	    fs.writeFile(filePath, fileContent, 'base64', function(err, result) {
	        if (err) throw err;
	        var fileId = nowDate;
			var readStream = fs.createReadStream(filePath, {
				encoding: 'binary'
			}), chunks = [];

			readStream.on('readable', function(){
				console.log('Image Loading.');
			});

			readStream.on('data', function(chunk){
				chunks.push(chunk);
				socket.broadcast.emit('image-chunk', generateImageMessage("User", chunk, fileId));
				socket.emit('image-chunk', generateImageMessage('mysqlf', chunk, fileId));
			});

			readStream.on('end', function(){
				console.log('Image loaded.');
			});

			if(callback) return callback('This is from the server');
	    });
		
	});

	socket.on('createLoactionMessage', (coords) => {
		socket.broadcast.emit('newLoactionMessage', generateLoactionMessage("User", coords.latitude, coords.longitude));
		socket.emit('newLoactionMessage', generateLoactionMessage('mysqlf', coords.latitude, coords.longitude));
	});

	socket.on('join', function(room) {

	    let numClients = 0;
	    if (rooms[room]) {
	      	numClients = rooms[room].length;
	    }
	    if (numClients < MAX_CLIENTS) {
	      	socket.on('ready', function() {
	        	//console.log("starting");
	        	socket.broadcast.to(room).emit('ready', socket.id);
	      	});
	      	socket.on('offer', function (id, message) {
	        	socket.to(id).emit('offer', socket.id, message);
	      	});
	      	socket.on('answer', function (id, message) {
	        	socket.to(id).emit('answer', socket.id, message);
	      	});
	      	socket.on('candidate', function (id, message) {
	        	socket.to(id).emit('candidate', socket.id, message);
	      	});
	      	socket.on('disconnect_chat', function(id, message) {
	        	socket.broadcast.to(room).emit('bye', socket.id);
	      	});
	      	socket.join(room);

	    } else {
	      	socket.emit('full', room);
	    }
  	});


	socket.on('disconnect', () => {
		//console.log('User disconnect');
	});
});

server.listen(port, () => {
	console.log(`Server is up on port ${port}`);
});



