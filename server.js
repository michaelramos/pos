var http = require('http');
var fs = require('fs');
var path = require('path');

const PORT = 9091;

function handleRequest(request, response) {
	fs.readFile(path.join(__dirname, request.url), 'utf8', function(err, data){
		response.end(data);
	});
}

var server = http.createServer(handleRequest);
server.listen(PORT, function(){
	console.log("SERVER listeneing on http://localhost:%s", PORT);
});