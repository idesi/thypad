(function($){
	var socket = io();
	//UI controls
	var loginForm = $('.login'),
		mainForm = $('.main'),
		txtUser = $('.login .txtUser'),
		currentInput = txtUser.focus(), //Will be used to auto set the focus of the currently relevant input field
		usersList = $('ul.users'),
		txtNote = $('.txtNote'),
		divRunningNote = $('.note'),
		showAuthorInfo = noop; 

	var COLORS = [
	    '#c1bbbb', '#908b8b', '#262525', '#f78b00',
	    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
	    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
	  ];

	//data/state
	var user = {
		username: null,
		connected: false,
		color: null
	};

	function noop(){
		return;
	}

	function setUserName () {
		var username = validateInput();
		if (!username) {
			return;
		}

		user.username = username;
		user.color = getUsernameColor(username);
		loginForm.fadeOut();
		mainForm.removeClass('hide');
		loginForm.off('click');
		socket.emit('new user', user);
	}

	function sendNote(){
		var note = validateInput();
		if (!note || !user.connected) {
			return;
		}
		var noteObj = {
			note: note,
			username: user.username,
			id: user.id
		};

		currentInput.val('');
		appendNote(noteObj);
		socket.emit('new note', noteObj);
	}

	function appendNote(noteObj){
		//Append the note and also link it to the user who created it
		var spanNote = $('<span>')
			.attr('data-username', noteObj.username)
			.attr('data-userid', noteObj.id)
			.text(noteObj.note + ' ');
		divRunningNote.append(spanNote);
	}

	function validateInput () {
		var input = cleanInput(currentInput.val().trim());
		return input;
	}

	function addUserToList (user) {
		var li = $('<li>')
			.attr('data-userid', user.id)
			.text(user.username);

		var dot = $('<div>').addClass('square')
			.css('background-color', user.color);

		li.prepend(dot);
		usersList.append(li);
	}

	function removeUserFromList (userId){
		var li = usersList.find('[data-userid="' + userId + '"]');
		li.remove();
	}

	//Listen for enter press
	//Keyboard events
	$(window).keydown(function (e) {
		// Auto-focus the current input when a key is typed
	    if (!(e.ctrlKey || e.metaKey || e.altKey)) {
	    	currentInput.focus();
	    }

	    if (e.keyCode == 13 && !e.shiftKey) {
	    	e.preventDefault();
	    	if (!user.username) {
	    		return setUserName();
	    	} else {

	    		return sendNote();
	    	}
	    }
	});

	//When the user clicks on span, show a tooltip that displays the name & status of the author.
	divRunningNote.on('click', 'span', function(e){
		e.preventDefault();
		hideTooltip();
		var $this = $(this),
			userId = $this.data('userid');
		showAuthorInfo = createShowAuthorInfo($this);

		//Check the status of the user with the server unless the person has clicked on their own note
		if (userId !== user.id) {
			socket.emit('check status', userId);	
		} else {
			showAuthorInfo(true);
		}
	});

	function createShowAuthorInfo(span){
		//This inner function will become "ShowAuthorInfo when the user requests the author info for a span"
		return function(isUserOnline){
			showTooltip(span, isUserOnline);
			//Reset showAuthorInfo to its default value of noop;
			showAuthorInfo = noop;
		};
	}

	function showTooltip (span, isUserOnline){
		$('<p class="tooltip"></p>')
	        .text('This note was created by: ' + span.data('username') + 
        		' (Current Status: ' + (isUserOnline ? 'online' : 'offline')+ ')')
	        .appendTo('body')
	        .fadeIn('slow');
	    setTimeout(function(){
	    	$(window).on('click.tooltip', hideTooltip);	
	    }, 0);
        
	}

	function hideTooltip(){
		$('.tooltip').remove();
		$(window).off('click.tooltip', hideTooltip);
	}

	// Prevents input from having injected markup
	function cleanInput (input) {
		return $('<div/>').text(input).text();
	}

	function getUsernameColor (username) {
	    // Compute hash code
	    var hash = 7;
	    for (var i = 0; i < username.length; i++) {
	       hash = username.charCodeAt(i) + (hash << 5) - hash;
	    }
	    // Calculate color
	    var index = Math.abs(hash % COLORS.length);
	    return COLORS[index];
	  }

	//Socket events
	socket.on('login success', function(users){
		//The last item in users array will be the current user
		user = users[users.length -1];
		users.forEach(addUserToList);
		currentInput = txtNote.focus();

		setupListeners();
	});

	function setupListeners(){
		socket.on('new user', addUserToList);
		socket.on('new note', appendNote);
		socket.on('has status', function(isUserOnline){
			showAuthorInfo(isUserOnline);
		});
		socket.on('user left', function(userId){
			removeUserFromList(userId);
		});
	}

	
})($);