const jwt = require("jsonwebtoken");

module.exports = {
    verifyToken: function(req, res, next) {
	   const bearerHeader = req.headers["authorization"];
	   if(typeof bearerHeader !== "undefined") {
	       req.token = bearerHeader;
	       jwt.verify(req.token, 'seceratkey', (err, authData) => {
	           if(err) {
	               res.sendStatus(403);
	           } else {
	               global.user_id   = authData.user.user_id;//user_type
	               global.user_type = authData.user.user_type;
	               global.organization_name = authData.user.organization_name;
	               const user = {
	                   user_id     : global.user_id,
	                   user_name   : authData.user.user_name,
	                   user_email  : authData.user.user_email,
	                   user_mobile : authData.user.user_mobile
	               }
	               	jwt.sign({ user }, 'seceratkey', { expiresIn: "3h" }, (err, token) => {
	               	//jwt.sign({ user }, 'seceratkey', (err, token) => {
	                   global.token = token;
	                   next();
	               });
	           }
	       });
	   } else {
	       res.sendStatus(403);
	   }
	},
    getStatusCode: function(statusCode, msg = '', data = []) {
    	let resultArr = {};
	    switch (parseInt(statusCode)) {
	       	case 410  :
	           	resultArr['result']           = "duplicate";
	           	resultArr['duplicate']        = {};
	           	resultArr['duplicate']["msg"] = "Email is duplicate";
	           	break;
	       	case 411  :
	           	resultArr['result']           = "duplicate";
	           	resultArr['duplicate']        = {};
	           	resultArr['duplicate']["msg"] = "Mobile No. is duplicate";
	           	break;
	       	case 412  :
	           	resultArr['result']           = "duplicate";
	           	resultArr['duplicate']        = {};
	           	resultArr['duplicate']["msg"] = "Organization name is duplicate";
	           	break;
	       	case 413  :
	           	resultArr['result']           = "invalid";
	           	resultArr['invalid']          = {};
	           	resultArr['invalid']["msg"]   = "Invalid Login credentials";
	           	break;
	       	case 200  :
	           	resultArr['result']           = "success";
	           	resultArr['success']          = {};
	           	resultArr['success']["msg"]   = "Operation successfull";
	           	break;
	       	case 400    :
	       	default:
	            resultArr['result']           = "error";
	            resultArr['error']            = {};
	            resultArr['error']["msg"]     = "Some error occured";
	   	}
	   	if(msg != '')
	       resultArr[ resultArr['result']]["msg"] = msg;
	   	resultArr["data"] = data;
	   	resultArr['statusCode']    = statusCode;
	   	resultArr['token'] = global.token;
	   	return resultArr;
	},
	sendInviationNotification: function(finalEventArr, centerAppId) {
	    var FCM = require('fcm-node');
	    var serverKey = '';//Server key here
	    var fcm = new FCM(serverKey);
	    for(let zz=0; zz < finalEventArr.length; zz++) {
	        console.log(finalEventArr[zz]);
	        var messageId = centerAppId[finalEventArr[zz].center_user_id];
	        var message = { 
	            to: messageId, 
	            collapse_key: 'your_collapse_key',
	            
	            notification: {
	                title: 'Title Here', 
	                body : 'Body here'
	            },
	            
	            data: {  //you can send only notification or only data(or include both)
	                my_key: 'my value',
	                my_another_key: 'my another value'
	            }
	        };
	        fcm.send(message, function(err, response){
	            if (err) {
	                console.log("Something has gone wrong!", err);
	            } else {
	                console.log("Successfully sent with response: ", response);
	            }
	        });
	    }
	},
	arr_diff: function(a1, a2) {
		var diff = [];
	    var z = 0;
		for(var i=0; i < a1.length; i++) {
	    	if(a2.indexOf(a1[i]) == -1) {
	        	diff[z] = a1[i];
	            z++;
	        }
	    }
	    return diff;
	},
	updateNullValueToBlank: function(data){
		return (data == undefined)? "": data;
	},
	updateNullValueToArray : function(data){
		return (data == undefined || data == "")? []: data;
	},
	image_path: ""
}