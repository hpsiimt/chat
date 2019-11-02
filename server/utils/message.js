let date = require('date-and-time');
let now = new Date();

var generateMessage = (from, text) => {
	return {
		from, 
		text, 
		createAt: new Date().getTime(),
		createTime: date.format(now, 'hh:mm A'),
		createDate: "Today",
	};
};

var generateLoactionMessage = (from, latitute, longitude) => {
	return {
		from, 
		url: `https://www.google.com/maps?${latitute},${longitude}`, 
		createAt: new Date().getTime(),
		createTime: date.format(now, 'hh:mm A'),
		createDate: "Today",
	};
};

var generateImageMessage = (from, data, id) => {
	return {
		from, 
		data, 
		id,
		createAt: new Date().getTime(),
		createTime: date.format(now, 'hh:mm A'),
		createDate: "Today",
	};
};


module.exports = { generateMessage, generateLoactionMessage, generateImageMessage };