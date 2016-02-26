var express = require('express'),
    bodyParser = require('body-parser'),
    formidable = require('formidable'),
    fs = require('fs'),
    path = require('path'),
    Converter = require("csvtojson").Converter, //csv to json
    GeoPoint = require('geopoint'), 
    GeoJSON = require('geojson'), //geojson converter
    app = express(),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override'),
    hostname = process.env.HOSTNAME || 'localhost'
    port= parseInt(process.env.PORT, 10) || 9999,
    publicDir = process.argv[2] || __dirname + '/';


app.get('/', function(req, res){
  res.sendFile('/index.html', {root: __dirname});
});

app.use(methodOverride());
app.use(bodyParser.json()); //support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true})); //support encoded bodies
app.use(express.static(publicDir)); //serves files statically.
app.use(errorHandler({
  dumpExceptions: true,
  showStack: true,
}));

/*
 * GET request to find users from a given min and max age range,
 * else an error will be shown.
 */
app.get('/users/age', function(req, res){
  fs.readFile("./json/jsonFile.json", 'utf8', function (err, data) {
    if (err) throw err;
    var jsonData = JSON.parse(data);
    var min = req.query.min_age;
    var max = req.query.max_age;
    var mapage_bool = req.query.mapage;
    var ageData = [];
    //stacks only the users that are within the age range.
    for(var x = 0; x < Object.keys(jsonData).length; x++){
      var age = jsonData[x].age;
      if (min <= age && age <= max){
        ageData.push(jsonData[x]);
      }
    }

    //checks if any users were found else error.
    if(ageData.length > 0){
      //if true then convert json to geoJSON to map it out,
      //else just send json format.
      if(mapage_bool == 'true'){
        var geo_result = convertToGeoJSON(ageData);
        res.writeHead(200, {"Content-Type" : "application/json"});
        res.end(JSON.stringify(geo_result));
      } else {
        res.writeHead(200, {"Content-Type" : "application/json"});
        res.end(JSON.stringify(ageData));
      }
    } else {
      res.writeHead(500);
      res.end("<p>No user found within the age range.</p>");
    }
  });
});

/*
 * GET request to find a specific id, else if not found an error will be shown.
 */
app.get('/users/user/:id', function(req, res){
  fs.readFile("./json/jsonFile.json", 'utf8', function (err, data) {
    if (err) throw err;
    var idData = JSON.parse(data);
    var idNum = req.params.id;
    var mapid_bool = req.query.mapid;

    if(Number(idNum) > 0 && Number(idNum) < Object.keys(idData).length){
      if(mapid_bool == 'true'){ 
        var id_data = [];
        id_data.push(idData[idNum - 1]);
        var geo_results = convertToGeoJSON(id_data);
        res.writeHead(200, {"Content-Type" : "application/json"});
        res.end(JSON.stringify(geo_results));
      } else {
        res.writeHead(200, {"Content-Type" : "application/json"});
        res.end(JSON.stringify(idData[req.params.id - 1]));
      }
    } else {
      res.writeHead(500);
      res.end("<p>Invalid id number.</p>");
    }
  });
});

/*
 * GET request for location for given latitude and longitude parameters and
 * finds any location within 5 mile radius, else an error will be shown.
 */
app.get('/users/loc', function(req, res){
  fs.readFile("./json/jsonFile.json", 'utf8', function (err, data) {
    if (err) throw err;
    var jsonData = JSON.parse(data);
    var lat = Number(req.query.lat);
    var lon = Number(req.query.long);
    var maploc_bool = req.query.maploc; 
    var startLoc = new GeoPoint(lat, lon);
    var req_Range = 5; //required range
    var usersLoc = [];

    for(var x = 0; x < Object.keys(jsonData).length; x++){
      var endLat = jsonData[x].lat;
      var endLon = jsonData[x].long;
      var endLoc = new GeoPoint(endLat, endLon);
      var dist = startLoc.distanceTo(endLoc); //mile distance between locations
      if(dist <= req_Range){
        usersLoc.push(jsonData[x]);
      }
    }

    if(usersLoc.length > 0){
      if(maploc_bool == 'true'){
        var geo_result = convertToGeoJSON(usersLoc);
        res.writeHead(200, {"Content-Type" : "application/json"});
        res.end(JSON.stringify(geo_result));
      } else {
        res.writeHead(200, {"Content-Type" : "application/json"});
        res.end(JSON.stringify(usersLoc));
      }
    } else {
      res.writeHead(500);
      res.end("<p>No user found within a 5 mile radius from given latitude and longitude.</p>");
    }
  });
});

/*
 * POST request that uploads the CSV file to /upload directory and converts 
 * the data into JSON format and saves the JSON file in /json directory.
 */
app.post('/map', function(req, res) {
  
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var old_path = files.csvFile.path,
    new_path = path.join(process.env.PWD, '/upload/', 
        files.csvFile.name);
    //saves CSV file in /upload directory
    fs.readFile(old_path, function(err, data) {
      fs.writeFile(new_path, data, function(err) {
        fs.unlink(old_path, function(err) {
          if (err) {
            res.send(500, "<h1>Error, retry or check your CSV file</h1>");
          } else {
            var fileStream = fs.createReadStream("./upload/user.csv");
            var converter = new Converter({constructResult:true});
            //read from csv file 
            fileStream.pipe(converter);
            //converts csv to json format
            converter.on("end_parsed", function(jsonObj) {
              fs.writeFile("./json/jsonFile.json", 
                  JSON.stringify(jsonObj), "utf8", function(err){
                    if(err){
                      res.send(500, "<p>Can't convert it to JSON, make sure"
                          + "the file is CSV format</p>");
                    } else {
                      res.status(200);
                      res.sendFile("map.html", { root: __dirname });
                    }
                  });
            });
          }
        });
      })
    });
  });
});

/*
 * GET request to send the data converted in GeoJSON format.
 */
app.get('/geodata', function(req, res) {
  fs.readFile("./json/jsonFile.json", 'utf8', function (err, data) {
    if (err) throw err;
    var jsonData = JSON.parse(data);
    var geojsondata = convertToGeoJSON(jsonData); //converts JSON to GeoJSON
    res.writeHead(200, {"Content-Type" : "application/json"});
    res.end(JSON.stringify(geojsondata));
  });
});

/*
 * GET request that shows the data in JSON format.
 */
app.get('/data', function(req, res) {
  fs.readFile("./json/jsonFile.json", 'utf8', function (err, data) {
    if (err) throw err;
    var jsonData = JSON.parse(data);
    res.writeHead(200, {"Content-Type" : "application/json"});
    res.end(JSON.stringify(jsonData));
  });
});

//converts JSON to GeoJSON format.
function convertToGeoJSON(json_data){
  return GeoJSON.parse(json_data, {Point: ['lat', 'long']});
}


console.log("Server showing \n %s listening at http://%s:%s",
    publicDir, hostname, port);
app.listen(port, hostname);
