var geoResult; //holds geoJSON data from server
var jsonResult; //holds json data from server
var map; //map object
var errormsg; //holds error message when there is an invalid input.

var geoData = "http://localhost:9999/geodata";

//First ajax call or when pages is refreshed.
var httpReq = new XMLHttpRequest();
httpReq.open("GET", geoData, true);
httpReq.setRequestHeader("Content-type", "application/json", true);
httpReq.onreadystatechange = function(){
  if(httpReq.readyState == 4 && httpReq.status == 200){
    geoResult = httpReq.responseText;
    addGeoData(geoResult);
  }
}
httpReq.send();

/*
 * creates the map and users data popups
 */
function addGeoData(jsondata){
  var geojson = L.geoJson(JSON.parse(jsondata), {
    onEachFeature: function(feature, layer) {
      var popupContent = 
        "<p>" + "id: " + feature.properties.id + " - " 
        + feature.properties.fname + " " + feature.properties.lname 
        + " | username: " + feature.properties.username + "</p>"
        + "<p>" + feature.properties.gender + ", " 
        + feature.properties.age + " years old</p>" 
        + "Comments: " +feature.properties.comments + "<br>" 
        + "Likes: " + feature.properties.likes + "<br>"
        + "Dislikes: " + feature.properties.dislikes + "<br>"
        + "Retweets: " + feature.properties.retweets;
      layer.bindPopup(popupContent);
    }
  });

  var jsonParsed = JSON.parse(jsondata);
  var lon = jsonParsed.features[0].geometry.coordinates[0];
  var lat = jsonParsed.features[0].geometry.coordinates[1];
  map = new L.map('map').setView([lat, lon], 9);

  L.tileLayer(
      'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png256?access_token='
      +
      'pk.eyJ1IjoidGF2bzIzIiwiYSI6ImNpZjBpN3lzdjBnZmNzNWx1YnE3c3RhcngifQ.' 
      +
      'p60a8TCdokmi2cu40W1R3A',
      {
        maxZoom: 18,
        id: 'tavo23.cif0i7xmk0gefsalua3ygtz0z', 
      }).addTo(map);
  geojson.addTo(map);
}

/*
 * AJAX call to get data from server and remaps the markers in the map.
 */
function ajaxCaller(jsonURL){
  var httpReq = new XMLHttpRequest();
  httpReq.open("GET", jsonURL, true);
  httpReq.setRequestHeader("Content-type", "application/json", true);
  httpReq.onreadystatechange = function(){
    //Gets data from server and checks if it is valid data.
    if(httpReq.readyState == 4 && httpReq.status == 200){
      jsonResult = httpReq.responseText;
      document.getElementById('error').innerHTML = '';
      map.remove();
      addGeoData(jsonResult);
    } else if(httpReq.status == 500) {
      errormsg = httpReq.responseText;
      document.getElementById('error').innerHTML = errormsg;
    }
  }
  httpReq.send();
}

//
//
// Methods to get specific data. 
//
//

function getAgeRange(){
  var ageData = "http://localhost:9999/users/age?min_age=" 
    + document.getElementById('minAge').value 
    + "&max_age=" + document.getElementById('maxAge').value 
    + "&mapage=true" ;

  ajaxCaller(ageData);
}

function getLoc(){
  var locData = "http://localhost:9999/users/loc?lat=" 
    + document.getElementById('lat').value 
    + "&long=" + document.getElementById('long').value
    + "&maploc=true";

  ajaxCaller(locData);
}

function getId(){
  var userData = "http://localhost:9999/users/user/" 
    + document.getElementById('id').value
    + "?mapid=true";

  ajaxCaller(userData);
}




