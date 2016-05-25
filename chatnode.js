#! /usr/bin/env node

/*
 * chatnode.js version 0.1
 *
 * chatnode is a simple NodeJS chat server.
 *
 * COPYRIGHT (C) 2016, IAN M. FINK.
 * ALL RIGHTS RESERVED.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. All advertising materials mentioning features or use of this software
 *    must display the following acknowledgement:
 *    This product includes software developed by IAN M. FINK.
 * 4. Neither the name of IAN M. FINK  nor the
 *    names of its contributors may be used to endorse or promote products
 *    derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY IAN M. FINK ''AS IS'' AND ANY
 * EXPRESS NTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL IAN M. FINK BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

/*******************************************************************/

function 
createConnectionCallback(socket)
{
	socket.addrPort = socket.remoteAddress + "_" + socket.remotePort;
	my_server.clients[socket.addrPort] = 
		{username:"", "socket":socket, quitNormal:0};
	console.log("CONNECTED: " + socket.addrPort + "\n");
	socket.write("Welcome: " + socket.addrPort + "\n");
	socket.write("Please enter a username:  ");
	socket.on('data', function(data) { receiveDataCallback(data, socket) });
	socket.on('close', function(data) { closeCallback(data, socket) });
	/* socket.on('end', function(data) { closeCallback(data, socket) }); */
} /* createServerCallback */

/*******************************************************************/

function 
receiveDataCallback(data, socket)
{
	var firstCharacter = "";
	var dataString = safeString(data);
	var d = new Date();

	dataString = dataString.replace("\n", "");
	dataString = dataString.replace("\r", "");
	dataString = dataString.trim();

	console.log("NAME: " + socket.addrPort);
	console.log("DATE: " + d.toLocaleString());
	console.log("DATA: " + dataString);
	delete d;

	/* has a username been chosen? */
	if (my_server.clients[socket.addrPort].username == "") {
		uniqueUserName(dataString, socket);
		if (my_server.clients[socket.addrPort].username == "") {
			return;
		}

		helpChat(socket);
		broadcast(EVERYONE, socket, 
			my_server.clients[socket.addrPort].username + 
			" JOINED THE CHAT.\n"
		);
	} else { /* process the chat data */
		firstCharacter = dataString.slice(0, 1);
		switch (firstCharacter) {
			/* is someone performing an action or possesion? */
			case ":":
				actionOrPossesion(socket, dataString.slice(1));
				break; /* ":" */
			case "/":
			/* is a menu action to be performed */
				performMenuAction(socket, dataString);
				break; /* "/" */
			default:
			/* speak message to all but me */
				broadcast(ALL_BUT_ME, socket, 
					my_server.clients[socket.addrPort].username + ":\n   " + 
					dataString + "\n"
				);
				break; /* default */
		} /* switch (firstCharacter) */
	}
} /* receiveDataCallback */

/*******************************************************************/

function
performMenuAction(socket, dataString)
{
	var command = dataString.slice(1, 2).toUpperCase();
	switch (command) {
		/* who is online */
		case 'W':
			whoIsOnLine(socket);
			break; /* 'W' */

		case 'Q':
			quitChat(socket);
			break; /* 'Q' */

		case '?':
			helpChat(socket);
			break; /* '?' */

		default:
			unrecognizedMenuAction(socket, command);
			break; /* default */
	} /* switch (command) */
} /* performMenuAction */


/*******************************************************************/

function
helpChat(socket)
{
	socket.write(helpMenu());
} /* helpChat */

/*******************************************************************/

function
quitChat(socket)
{
	var uName = myUserName(socket);
	var clientEntry = myClientEntry(socket);

	if (clientEntry !== {}) {
		clientEntry.quitNormal = 1;
	} else {
		console.log("myClientEntry FAILED\n");
	}

	socket.write("QUIT chat.\n");
	broadcast(ALL_BUT_ME, socket, uName + " has left chat.\n");
	socket.end();

} /* quitChat */

/*******************************************************************/

function
whoIsOnLine(socket)
{
	socket.write("Who is OnLine:\n");
	for (var key in my_server.clients) {
		socket.write(my_server.clients[key].username + "\n");
	}

} /* whoIsOnLine */

/*******************************************************************/

function
actionOrPossesion(socket, dataString)
{
	var spacer = "";

	if (dataString.slice(0, 2).toLowerCase() != "\'s") { 
		spacer = " ";
	}

	broadcast(ALL_BUT_ME, socket,
		my_server.clients[socket.addrPort].username + 
		spacer + dataString + "\n"
	);

} /* actionOrPossesion */

/*******************************************************************/

function
uniqueUserName(dataString, socket)
{
	for (var key in my_server.clients) {
		if (my_server.clients[key].username == dataString) {
			socket.write("\"" + dataString + 
				"\" is already in use.  Choose another name.\n"
			);
			socket.write("Please enter a user name:  ");
			return;
		}
	}
	my_server.clients[socket.addrPort].username = dataString;
} /* uniqueUserName */

/*******************************************************************/

function
broadcast(who, socket, broadcastData)
{
	if (who == EVERYONE) {
		for (var key in my_server.clients) {
			my_server.clients[key].socket.write(broadcastData);
		}
	} else if (who == ALL_BUT_ME) {
		for (var key in my_server.clients) {
			if (socket == my_server.clients[key].socket) {
				continue;
			}
			my_server.clients[key].socket.write(broadcastData);
		}
	} else { /* no one to broadcast to :( */
		return;
	}
} /* broadcast */

/*******************************************************************/

function 
closeCallback(data, socket)
{
	var uName = myUserName(socket);
	var clientEntry = myClientEntry(socket);

	console.log("CLOSED: " + socket.addrPort + " " + uName + "\n");

	if (clientEntry !== {}) {
		if (clientEntry.quitNormal == 0) {
			broadcast(ALL_BUT_ME, socket, 
				uName + " vanished into a cloud of greasy orange smoke!\n"
			);
		}
	} else {
		console.log("myClientEntry FAILED\n");
	}

	delete my_server.clients[socket.addrPort];

} /* closeCallback */

/*******************************************************************/

function
myUserName(socket)
{
	for (var key in my_server.clients) {
		if (my_server.clients[key].socket == socket) { 
			return my_server.clients[key].username;
		}
	}

	return "ERROR:  NO USERNAME";

} /* myUserName */

/*******************************************************************/

function
myClientEntry(socket)
{
	for (var key in my_server.clients) {
		if (my_server.clients[key].socket == socket) { 
			return my_server.clients[key];
		}
	}

	return {};

} /* myClientEntry */

/*******************************************************************/

function
safeString(unsafeString)
{
	var my_string = unsafeString.toString();
	return my_string.replace(/[^\x20-\x7E]/g, '');
} /* safeString */

/*******************************************************************/

function
helpMenu()
{
	return ( 
		"***********************************************\n" +
		"Chat commands:\n" +
		"/q    Quit chat.\n" +
		"/w    Who is in chat.\n" +
		"/?    Help with chat (this menu)\n" +
		"***********************************************\n\n" 
		);
} /* setHelpMenu */

/*******************************************************************/

var net = require('net');

var HOST = "127.0.0.1";
var PORT = 8010;
var EVERYONE = 1;
var ALL_BUT_ME = 2;

var my_server = {};

my_server.clients = {};

my_server.server = net.createServer(createConnectionCallback);


my_server.server.listen(PORT, HOST);

console.log(
	"***********************************************\n" +
	"COPYRIGHT (C) 2016\n" +
	"IAN M. FINK.\n" +
	"ALL RIGHTS RESERVED\n" +
	"***********************************************\n" +
	"\n" +
	"chat server is running HOST=\'" + HOST + "\' PORT=\'" + PORT + "\'\n\n" +
	helpMenu() 
	);

/*
 * End of file chatnode.js
 */

