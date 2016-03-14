var express = require('express'),
	app = express(),
	http = require('http'),
	server = http.createServer(app),
	io = require('socket.io')(server),
	users = [];

//Serve static files from the public folder
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
	res.sendFile(__dirname + 'public/index.html');
});

io.on('connection', function(socket){
	socket.on('new user', function(user){
		//store the user in the socket session for this client so we can refer to it easily.
		
		user.id = getUserId();
		socket.userId = user.id;
		user.connected = true;
		users.push(user);
		//Let the client know that we successfully logged this user in
		socket.emit('login success', users);

		//:Let all connected users know that we have a user
		socket.broadcast.emit('new user', user);
	});

	socket.on('new note', function(noteObj){
		socket.broadcast.emit('new note', noteObj);
	});

	socket.on('check status', function(userId){
		//Check if the user is still in the users array. If so, then check the connected flag
		var user = findUser(userId);
		socket.emit('has status', !!user);
	});

	socket.on('disconnect', function(){
		var userId = socket.userId;
		if (userId) {
			var user = findUser(userId);
			var index = users.indexOf(user);
			if (index >= -1) {
				users.splice(index, 1);	
			}
			
			socket.broadcast.emit('user left', userId);
		}
		
	});
});

function findUser(userId){
	return find(users, function(user){
		return user.id === userId;
	});
}

function getUserId (){
	var maxId = 0;
	//Since we dont enforce unique names, lets just use ints to to keep users unqiue. 
	//Because this is a demo app, lets keep the implementation basic
	users.forEach(function(user){
		maxId = user.id > maxId ? user.id : maxId;
	});

	return ++maxId;
}

function find(arr, preciate){
	for (var i = 0; i <= arr.length -1; i++) {
		if(preciate.call(arr, arr[i])){
			return arr[i];
		}
	}
	return void 0;
}

server.listen(process.env.PORT || 3000);