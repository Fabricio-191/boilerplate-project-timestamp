const dns = require('dns');
const multer  = require('multer')
const express = require('express');
const bodyParser = require("body-parser");
const app = express();

const cors = require('cors');
app.use(cors({optionsSuccessStatus: 200})); 
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

/* Timestamp microservice
app.get("/api/:date?", (req, res) => {
  	let date;
	if(!req.params.date || req.params.date === ''){
		date = new Date()
	// @ts-ignore
	}else if(isNaN(req.params.date)){
		date = new Date(req.params.date)

		// @ts-ignore
		if(isNaN(date)){
			res.json({
				error : "Invalid Date"
			})
			return;
		}
	}else{
		date = new Date(Number(req.params.date))
	}

	res.json({
		unix: Number(date),
		utc: date.toUTCString()
	})
});
*/

// #region Request Header Parser Microservice
app.get("/api/whoami", (req, res) => {
	res.json({
		ipaddress: req.headers['x-forwarded-for'],
		language: req.headers['accept-language'],
		software: req.headers['user-agent']
	})
});
// #endregion

// #region URL Shortener Microservice
const shortedURLs = []; // didn't use a database because i was lazy and this is a small test
app.get("/api/shorturl/:short_url", function (req, res) {
	const url = shortedURLs[req.params.short_url]

	if(url){
		res.redirect(url)
	}else{
		res.json({ error: 'invalid url' })
	}
});

app.post("/api/shorturl", async function (req, res) {
	let url;

	try{
		url = new URL(req.body.url);
	}catch{
		res.json({ error: 'invalid url' })
		return
	}
	
	dns.lookup(url.hostname, (err) => {
		if(err){
			res.json({ error: 'invalid url' })
		}else{
			const i = shortedURLs.push(req.body.url) - 1;
			res.json({ 
				original_url: req.body.url,
				short_url: i
			})
		}
	});
});
// #endregion

// #region File Metadata Microservice
app.post("/api/fileanalyse", multer({ dest: 'uploads/' }).single('upfile'), (req, res) => {
	if(!req.file){
		res.json({
			error: 'No file uploaded'
		});
		return;
	}

	res.json({
		name: req.file.originalname,
		type: req.file.mimetype,
		size: req.file.size
	})
});
// #endregion

// #region Exercise tracker
const uri = `mongodb://Fabricio-191:${process.env.mongoPass}@ac-eeqxbaq-shard-00-00.whoqxgz.mongodb.net:27017,ac-eeqxbaq-shard-00-01.whoqxgz.mongodb.net:27017,ac-eeqxbaq-shard-00-02.whoqxgz.mongodb.net:27017/?ssl=true&replicaSet=atlas-jfpg69-shard-0&authSource=admin&retryWrites=true&w=majority`;

const mongoose = require('mongoose')
//	.set('autoIndex', false)
	.set('strictQuery', true);

// @ts-ignore
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }) 
	.then(() => console.log('Connected to database'))
	.catch(err => console.log(err));

const exerciseSchema = new mongoose.Schema({
	username:  String,
	description: String,
	duration: Number,
	date: { type: Date },
});
const exerciseModel = mongoose.model('Exercise', exerciseSchema);

const userSchema = new mongoose.Schema({
	username: String,
	count: Number,
	logs: [{
		description: String,
		duration: Number,
		date: { type: Date },
	}],
});
const userModel = mongoose.model('User', userSchema);

app.post("/api/users", async (req, res) => {
	// You can POST to /api/users with form data username to create a new user.
	// The returned response from POST /api/users with form data username will be an object with username and _id properties.
	const user = new userModel({
		username: req.body.username,
		count: 0,
		logs: [],
	});
	await user.save();
	res.json(user);
});

app.get("/api/users", async (req, res) => {
	// You can make a GET request to /api/users to get a list of all users.
	// The GET request to /api/users returns an array.
	const users = await userModel.find();
	res.json(users);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
	// You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used.
	// The response returned from POST /api/users/:_id/exercises will be the user object with the exercise fields added.
	const id = req.params._id;

	const user = await userModel.findById(id);
	if(!user) return res.json({ error: "User not found" });

	const exercise = new exerciseModel({
		username: user.username,
		description: req.body.description,
		duration: req.body.duration,
		date: req.body.date ? new Date(req.body.date) : new Date(),
	});
	await exercise.save()

	user.count++;
	user.logs.push({
		description: exercise.description,
		duration: exercise.duration,
		date: exercise.date,
	});

	await user.save();

	res.json({
		_id: exercise._id,
		username: exercise.username,
		description: exercise.description,
		duration: exercise.duration,
		// @ts-ignore
		date: exercise.date.toDateString(),
	})
});

app.get("/api/users/:_id/logs", (req, res) => {
	// You can add from, to and limit parameters to a GET /api/users/:_id/logs request to retrieve part of the log of any user. from and to are dates in yyyy-mm-dd format. limit is an integer of how many logs to send back.
	const user = userModel.findById(req.params._id);



	res.json(user);
});
// #endregion

app.listen(process.env.PORT || 3000, () => {
	console.log("Your app is listening on port", process.env.PORT || 3000);
});