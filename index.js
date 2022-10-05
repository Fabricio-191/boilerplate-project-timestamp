const dns = require('dns');
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

const shortedURLs = []
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

app.get("/api/whoami", (req, res) => {
	res.json({
		ipaddress: req.headers['x-forwarded-for'],
		language: req.headers['accept-language'],
		software: req.headers['user-agent']
	})
});

app.get("/api/:date?", (req, res) => {
  	let date;
	if(!req.params.date || req.params.date === ''){
		date = new Date()
	}else if(isNaN(req.params.date)){
		date = new Date(req.params.date)

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

app.listen(process.env.PORT);
