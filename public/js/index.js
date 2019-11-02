var localstream;
var imageChunks = [];
const socket = io.connect(window.location.origin);
const localVideo = document.querySelector('.localVideo');
const remoteVideos = document.querySelector('.remoteVideos');
const peerConnections = {};

let room = !location.pathname.substring(1) ? 'home' : location.pathname.substring(1);
let getUserMediaAttempts = 5;
let gettingUserMedia = false;
var userName = makeid();
console.log(userName);
const config = {
  'iceServers': [{
    'urls': ['stun:stun.l.google.com:19302']
  }]
};

const constraints = {
  // audio: true,
  video: { facingMode: "user" }
};

socket.on('connect', function() {
	  console.log('Connected to server');
    socket.emit('add-user', {
        username: userName
    });
});

socket.on('newMessage', function(message){
	if(message.from != "mysqlf") {
		var htmlData = '<div class="incoming_msg"  >';
	    htmlData += '<div class="incoming_msg_img"> <img src="https://ptetutorials.com/images/user-profile.png" alt="sunil"> </div>';
	    htmlData += '<div class="received_msg">';
	    htmlData += '<div class="received_withd_msg">';
	    htmlData += '<p>' + message.text + '</p>';
	    htmlData += '<span class="time_date">' + message.createTime + ' | ' + message.createDate + '</span>';
	    htmlData += '</div>';
	    htmlData += '</div>';
	    htmlData += '</div>';
	} else {
		var htmlData = '<div class="outgoing_msg">';
        htmlData += '<div class="sent_msg">';
        htmlData += '<p>' + message.text + '</p>';
        htmlData += '<span class="time_date">' + message.createTime + ' | ' + message.createDate + '</span>';
        htmlData += '</div>';
	}
	
	$("#messages").append(htmlData);
	$('#messages').scrollTop($('#messages')[0].scrollHeight);
});

socket.on('newLoactionMessage', function(message){
	if(message.from != "mysqlf") {
		var htmlData = '<div class="incoming_msg"  >';
	    htmlData += '<div class="incoming_msg_img"> <img src="https://ptetutorials.com/images/user-profile.png" alt="sunil"> </div>';
	    htmlData += '<div class="received_msg">';
	    htmlData += '<div class="received_withd_msg">';
	    htmlData += '<p><a target="_blank" href="' + message.url +'" >Location</a></p>';
	    htmlData += '<span class="time_date">' + message.createTime + ' | ' + message.createDate + '</span>';
	    htmlData += '</div>';
	    htmlData += '</div>';
	    htmlData += '</div>';
	} else {
		var htmlData = '<div class="outgoing_msg">';
        htmlData += '<div class="sent_msg">';
        htmlData += '<p><a target="_blank" href="' + message.url +'" >Location</a></p>';
        htmlData += '<span class="time_date">' + message.createTime + ' | ' + message.createDate + '</span>';
        htmlData += '</div>';
	}
	$("#messages").append(htmlData);
	$('#messages').scrollTop($('#messages')[0].scrollHeight);
});

socket.on('image-chunk', function(result){
	if(document.getElementById(result.id)) {
		var img = document.getElementById(result.id);
	} else {
		imageChunks = [];
		if(result.from != "mysqlf") {
			var htmlData = '<div class="incoming_msg"  >';
			htmlData += '<div class="incoming_msg_img"> <img src="https://ptetutorials.com/images/user-profile.png" alt="sunil"> </div>';
			htmlData += '<div class="received_msg">';
		    htmlData += '<div class="received_withd_msg">';
		    htmlData += '<p><img style="width:50%" id="' + result.id + '"></p>';
		    htmlData += '<span class="time_date">' + result.createTime + ' | ' + result.createDate + '</span>';
		    htmlData += '</div>';
		    htmlData += '</div>';
		    htmlData += '</div>';
		} else {
			var htmlData = '<div class="outgoing_msg">';
	        htmlData += '<div class="sent_msg">';
	        htmlData += '<p><img style="width:50%" id="' + result.id + '"></p>';
	        htmlData += '<span class="time_date">' + result.createTime + ' | ' + result.createDate + '</span>';
	        htmlData += '</div>';
		}
	    $("#messages").append(htmlData);
	    $('#messages').scrollTop($('#messages')[0].scrollHeight);
		var img = document.getElementById(result.id);
	}
	imageChunks.push(result.data);
	img.setAttribute('src', 'data:image/jpeg;base64,' + window.btoa(imageChunks));
});


socket.on('full', function(room) {
  alert('Room ' + room + ' is full');
});

socket.on('bye', function(id) {
  console.log("bye " + id);
  handleRemoteHangup(id);
});

if (room && !!room) {
  socket.emit('join', room);
}

window.onunload = window.onbeforeunload = function() {
  stopVideoChat();
  socket.close();
};

socket.on('ready', function (id) {
  if (!(localVideo instanceof HTMLVideoElement) || !localVideo.srcObject) {
    return;
  }
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;
  if (localVideo instanceof HTMLVideoElement) {
    peerConnection.addStream(localVideo.srcObject);
  }
  peerConnection.createOffer()
  .then(sdp => peerConnection.setLocalDescription(sdp))
  .then(function () {
    socket.emit('offer', id, peerConnection.localDescription);
  });
  peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, id);
  peerConnection.onicecandidate = function(event) {
    if (event.candidate) {
      socket.emit('candidate', id, event.candidate);
    }
  };

});

socket.on('offer', function(id, description) {
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;
  if (localVideo instanceof HTMLVideoElement) {
    peerConnection.addStream(localVideo.srcObject);
  }
  peerConnection.setRemoteDescription(new RTCSessionDescription(description))
  .then(() => peerConnection.createAnswer())
  .then(sdp => peerConnection.setLocalDescription(sdp))
  .then(function () {
    socket.emit('answer', id, peerConnection.localDescription);
  });
  peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, id);
  peerConnection.onicecandidate = function(event) {
    if (event.candidate) {
      socket.emit('candidate', id, event.candidate);
    }
  };
});

socket.on('candidate', function(id, candidate) {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate))
  .catch(e => console.error(e));
});

socket.on('answer', function(id, description) {
  peerConnections[id].setRemoteDescription(new RTCSessionDescription(description));
});


socket.on('disconnect', function() {
	console.log('Disconnect from server');
});

function startVideoChat() {
  getUserMediaDevices();
};


function getUserMediaSuccess(stream) {
  localstream = stream;
  gettingUserMedia = false;
  if (localVideo instanceof HTMLVideoElement) {
    !localVideo.srcObject && (localVideo.srcObject = stream);
  }
  socket.emit('ready');
}

function handleRemoteStreamAdded(stream, id) {
  const remoteVideo = document.createElement('video');
  remoteVideo.srcObject = stream;
  remoteVideo.setAttribute("id", id.replace(/[^a-zA-Z]+/g, "").toLowerCase());
  remoteVideo.setAttribute("playsinline", "true");
  remoteVideo.setAttribute("autoplay", "true");
  remoteVideos.appendChild(remoteVideo);
  if (remoteVideos.querySelectorAll("video").length === 1) {
    remoteVideos.setAttribute("class", "one remoteVideos");
  } else {
    remoteVideos.setAttribute("class", "remoteVideos");
  }
}

function getUserMediaError(error) {
  gettingUserMedia = false;
  (--getUserMediaAttempts > 0) && setTimeout(getUserMediaDevices, 1000);
}

function getUserMediaDevices() {
  if (localVideo instanceof HTMLVideoElement) {
    if (localVideo.srcObject) {
      getUserMediaSuccess(localVideo.srcObject);
    } else if (!gettingUserMedia && !localVideo.srcObject) {
      gettingUserMedia = true;
      navigator.mediaDevices.getUserMedia(constraints)
      .then(getUserMediaSuccess)
      .catch(getUserMediaError);
    }
  }
}

function handleRemoteHangup(id) {
  console.log(id);
  peerConnections[id] && peerConnections[id].close();
  delete peerConnections[id];
  document.querySelector("#" + id.replace(/[^a-zA-Z]+/g, "").toLowerCase()).remove();
  if (remoteVideos.querySelectorAll("video").length === 1) {
    remoteVideos.setAttribute("class", "one remoteVideos");
  } else {
    remoteVideos.setAttribute("class", "remoteVideos");
  }
}


function stopVideoChat() {
    localstream.stop();
    localVideo.srcObject = null;
    socket.emit('disconnect_chat', {
      from: 'user'
    });
    for(var x in peerConnections){
      handleRemoteHangup(x);
    }
}

$("#sendMessage").on('click', function(e) {
	if($.trim($("#message").val()) != ""){
		socket.emit('createMessage', {
			from: 'user',
			text: $("#message").val()
		}, function(res) {
			console.log(res);
			$("#message").val("");
		});
	}
	
});

$("#sendImage").on('click', function(e) {
	$("#fileType").click();
});



$("#sendLocation").on('click', function() {
	if(!navigator.geolocation){
		return alert('Geoloaction not supported by your browser.');
	}

	navigator.geolocation.getCurrentPosition(function(position) {
		socket.emit('createLoactionMessage', {
			'latitude' : position.coords.latitude,
			'longitude': position.coords.longitude
		})
	}, function() {
		alert("Unable to fetch loaction.")
	})

});

function fileValidation() {
	var fileInput = document.getElementById('fileType');
    var filePath = fileInput.value;
    var allowedExtensions = /(\.jpg|\.jpeg|\.png|\.gif)$/i;
    if(!allowedExtensions.exec(filePath)){
        alert('Please upload file having extensions .jpeg/.jpg/.png/.gif only.');
        fileInput.value = '';
        return false;
    } else {
        if (fileInput.files && fileInput.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
            	imageChunks = [];
				socket.emit('createImage', {
					from: 'user',
					text: e.target.result
				}, function(res) {
					console.log(res + "aaaa");
				})
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    }
}

function sendResent() {
    socket.emit('messagePersonal', {
        username: userName
    }, function(res) {
        console.log(res + "aaaa");
    });
}

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}



