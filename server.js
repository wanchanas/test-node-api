const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')
const logs = require('./log')
var moment = require('moment');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const port = process.env.PORT || 3000
const places = require("google-places-web").default; // instance of GooglePlaces Class;

// Setup"
places.apiKey = "AIzaSyD7Gx9KOZ5p-NANXqNbid4WqR1g1X18flE";
//places.apiKey = "AIzaSyDqzWLn5dOhOIhzZN2kz-jePA0HM1vV-Sg";
places.debug = false; // boolean;

app.get('/', (req, res) => {
    res.status(200).send("SCG")
})

app.get('/logs', (req, res) => {
    res.status(200).json(logs)
})

app.get('/restaurant/bangsue', (req, res) => {
    
    var resultJson = {}

    places.nearbysearch({
        location: "13.828025,100.528100", // LatLon delimited by,
        radius: "3000",  // Radius cannot be used if rankBy set to DISTANCE
        type: ["restaurant", "food"] // Undefined type will return all types
        //rankby: "distance" // See google docs for different possible values
      })
        .then(result => {

            // result object
            resultJson = JSON.parse(JSON.stringify(result));
            
            res.status(200).json(resultJson)
        })
        .catch(e => {
            console.log(e)
            res.status(404).send(String(e))
        });
})

//https://bobe-line-bot.herokuapp.com/webhook
//For line message api
app.post('/webhook', (req, res) => {

    let reply_token = req.body.events[0].replyToken
    let msg = req.body.events[0].message.text

    var log = {"log": moment().add(7, 'hours').format('Y-M-D H:m:s') +": reply_token = " + reply_token + " msg = " + msg}
    logs.push(JSON.parse(JSON.stringify(log)))

    var resultJson = {}

    places.nearbysearch({
        location: "13.828025,100.528100", // LatLon delimited by,
        radius: "3000",  // Radius cannot be used if rankBy set to DISTANCE
        type: ["restaurant", "food"], // Undefined type will return all types
        keyword: msg
        //rankby: "distance" // See google docs for different possible values
      })
        .then(result => {
            // result object
            resultJson = JSON.parse(JSON.stringify(result));

            resultJson = resultJson.sort(function(a, b) {
                return parseFloat(b.rating) - parseFloat(a.rating);
            });

            var answer = ""
            for(var place in resultJson){

                answer += String(parseInt(place)+1) +". " +resultJson[place].name + " (" + resultJson[place].rating+ "*) "
                answer += resultJson[place].vicinity + "\n"

                /*
                if(resultJson[place].photos != null)
                {
                    answer += " " + resultJson[place].photos[0].html_attributions +"\n"
                }
                */
            }

            reply(reply_token, answer)

        })
        .catch(e => {
            reply(reply_token, String(e))
            console.log(e)
        });

    res.sendStatus(200)
})

//start sever
app.listen(port, () => {
    console.log('Start server at port '+port+'.')
})

function reply(reply_token, msg) {

    logs.push(JSON.parse(JSON.stringify({"log": moment().add(7, 'hours').format('Y-M-D H:m:s') + ': answer = ' + msg})))

    let headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer rx+8yxCgh0eqm1yRd+SV+KJZiIImGqimXj4ybTTnxuOSwGSGXIK8y08PKo5lDh80ns6NG99eU91CDEVNjCcl0Sd9rLE9edz0x2Odtk1i9AtvdS5TksLYf3wfBCD73l36GhoGC4QYDk0iTiT6yotXRgdB04t89/1O/w1cDnyilFU='
    }

    let body = JSON.stringify({
        replyToken: reply_token,
        messages: [{
            type: 'text',
            text: msg
        }]
    })

    request.post({
        url: 'https://api.line.me/v2/bot/message/reply',
        headers: headers,
        body: body
    }, (err, res, body) => {
        
        var log = {"log": moment().add(7, 'hours').format('Y-M-D H:m:s')+': status = ' + res.statusCode}
        logs.push(JSON.parse(JSON.stringify(log)))

        console.log('status = ' + res.statusCode);
    });
}