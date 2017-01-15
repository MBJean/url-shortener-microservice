// Express
var express = require("express");

// The other modules
var mongodb = require("mongodb");
var shortid = require("shortid");
var validUrl = require("valid-url");
var config = require("./config.js");

// The MongoDB connection
var mLab = "mongodb://" + config.db.host + "/" + config.db.name;
var MongoClient = mongodb.MongoClient;

var app = express();

// Set port
app.set('port', process.env.PORT || 8080);

// For adding to the DB
app.get('/new/:url(*)', function(req, res, next) {
	MongoClient.connect(mLab, function (err, db) {
	  if (err) {
	    console.log("Unable to connect to the database.", err);
	  } else {
	    console.log("Connected to the database.");
	    var collection = db.collection("links");
		var params = req.params.url;
		var newLink = function(db, callback) {
			// check against DB for match
			collection.findOne({ "url": params }, { short: 1, _id: 0 }, function (err, doc) {
				if (doc != null) {
					res.json({ original_url: params, short_url: req.headers.host + "/" + doc.short });
				} else {
					if (validUrl.isUri(params)) {
						var shortCode = shortid.generate();
						var newUrl = { url: params, short: shortCode };
						collection.insert([newUrl]);
						res.json({ original_url: params, short_url: req.headers.host + "/" + shortCode });
					} else {
						res.json({error: "Wrong URL format. Make sure you have a valid protocol and a real site."});
					}
				}
			});
		};
		newLink(db, function(){
			db.close();
		});
	  };
	});
});

// For redirecting
app.get("/:short", function (req, res, next) {
	MongoClient.connect(mLab, function (err, db){
		if (err) {
			console.log("Unable to connect to server.", err);
		} else {
			console.log("Connected to server.");
			var collection = db.collection("links");
			var params = req.params.short;
			var findLink = function (db, callback) {
				collection.findOne({ "short": params }, { url: 1, _id: 0 }, function (err, doc) {
					if (doc != null) {
						res.redirect(doc.url);
					} else {
						res.json({ error: "No corresponding shortlink found in the database." });
					}
				});
			};
			findLink(db, function() {
				db.close();
			});
		}
	});
});

app.get("/", function (req, res, next) {
	res.send("This is a simple app that shortens URL and stores them in a database (MongoDB). Input a valid URL as a parameter of 'new/', and visit that URL via its shortcode by inputing it as a direct URL parameter.");
});

app.listen(app.get('port'), function() {
 console.log('Server started on localhost:' + app.get('port') + '; Press Ctrl-C to terminate.');
});