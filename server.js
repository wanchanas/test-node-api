const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')
const logs = require('./log')
const modelsContents = require('./models/content_message')

var moment = require('moment');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const port = process.env.PORT || 3000
const places = require("google-places-web").default; // instance of GooglePlaces Class;

// Setup
places.apiKey = "AIzaSyD7Gx9KOZ5p-NANXqNbid4WqR1g1X18flE"; //for heroku
//places.apiKey = "AIzaSyDqzWLn5dOhOIhzZN2kz-jePA0HM1vV-Sg"; //for localhost
places.debug = false; // boolean;

app.get('/', (req, res) => {
    res.status(200).send("Hello")
})

app.get('/xyz', (req, res) => {

    var resultMsg = "Please find x,y,z in [x, 5, 9, 15, 23, y, z]\n----------------------\n"
    var isCompleted = false
    var diff = 0

    var listNumbers = [5, 9, 15, 23]
    var findNumbers = []
    var diffNumbers = []

    while(!isCompleted)
    {
        if(diffNumbers.length == 0)
        {
            diffNumbers = listNumbers
        }

        diffNumbers = findDiff(diffNumbers);
        if(diffNumbers.length <= 1 || (Math.abs(diffNumbers[0] - diffNumbers[1]) == 0 ))
        {
            diff = diffNumbers[0]
            isCompleted = true
        }else{
            findNumbers = diffNumbers
        }
    }

    resultMsg += "Different in variation number is : "+ diff + "\n"

    for(var i = 0; i < 1; i ++)
    {
        findNumbers.unshift(findNumbers[0] - diff)
        var prevNum = listNumbers[0] - findNumbers[0]
        
        //Add prev number
        listNumbers.unshift(prevNum)
    }

    for( var i = 0; i < 2; i++)
    {
        findNumbers.push(findNumbers[findNumbers.length - 1 ] + diff)
        var nextNum = findNumbers[findNumbers.length - 1] + listNumbers[listNumbers.length -1]
        
        //Add next number
        listNumbers.push(nextNum)
    }

    resultMsg += "Variation numbers is : " + findNumbers.join(",") + "\n"
    resultMsg += "Result of numbers is : " + listNumbers.join(",") + "\n"

    res.status(200).send(resultMsg)
})

function findDiff(numbers)
{
    var diffs = []
    for(var i = 0; i < numbers.length; i++)
    {
        try {
            
            var a = numbers[i]
            var b = numbers[i+1]

            var diff = Math.abs( a - b )

            if(!Number.isNaN(diff))
            {
                diffs.push(diff)
                console.log(diff)
            }

        } catch (error) {
            console.log(error.message)
        }
    }

    return diffs;
}


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

            /*
            var answer = ""
            for(var place in resultJson){

                answer += String(parseInt(place)+1) +". " +resultJson[place].name + " (" + resultJson[place].rating+ "*) "
                answer += resultJson[place].vicinity + "\n"
            }

            reply(reply_token, answer)
            */

            var jsonReply = initReplyMessage(resultJson);
            reply(reply_token, jsonReply);

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

    logs.push({"log":JSON.parse(body)})

    request.post({
        url: 'https://api.line.me/v2/bot/message/reply',
        headers: headers,
        body: body
    }, (err, res, body) => {
        
        var log = {"log": moment().add(7, 'hours').format('Y-M-D H:m:s')+': status = ' + res.statusCode + ":" + JSON.stringify(body)+ ":" + JSON.stringify(res)}
        logs.push(JSON.parse(JSON.stringify(log)))

    });
}

function initReplyMessage(placeResults)
{
    var maxwidth = 1024;
    var replyMessage = {
        type: 'flex',
        altText: 'Flex Message',
        contents: {
          type: 'carousel',
          contents: []
        }
      }
    
    var total = 1;
    for(var place in placeResults){
     
        if(total > 1)
        {
            break;
        }

        var content = modelsContents;
    
        content.body.contents.push({
                "type": "text",
                "text": placeResults[place].name,
                "size": "xl",
                "weight": "bold"
            });

        if(placeResults[place].photos != null && placeResults[place].photos.length > 0)
        {
            var photo = "https://maps.googleapis.com/maps/api/place/photo?maxwidth="+maxwidth+"&photoreference="+placeResults[place].photos[0].photo_reference+"&key="+places.apiKey
            photo = "https://static.bkkmenu.com/files/2018/02/Crostini-9-1005x670.jpg";
            content.hero.url = photo;
        }

        content.hero.action.label = ""
        content.hero.action.uri = encodeURI("https://www.google.com/maps/dir/Current+Location/"+placeResults[place].geometry.location.lat+","+placeResults[place].geometry.location.lng+"");
        content.hero.action.uri = "https://www.google.co.th";
        //Rating
        var rating = {
            "type": "box",
            "layout": "baseline",
            "margin": "md",
            "contents": []
        };
        var rate = parseInt(placeResults[place].rating, 10);
        for(var i=0; i < rate; i++ )
        {
            rating.contents.push({
                "type": "icon",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png",
                "size": "sm"
              });
        }

        for(var i=0; i < (5-rate); i++ )
        {
            rating.contents.push({
                "type": "icon",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png",
                "size": "sm"
              });
        }
        rating.contents.push({
            "type": "text",
            "text": placeResults[place].rating,
            "flex": 0,
            "margin": "md",
            "size": "sm",
            "color": "#999999"
        });

        content.body.contents.push(rating);

        var box =  {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "margin": "lg",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "text",
                    "text": "Place",
                    "flex": 1,
                    "size": "sm",
                    "color": "#AAAAAA"
                  },
                  {
                    "type": "text",
                    "text": placeResults[place].vicinity,
                    "flex": 5,
                    "size": "sm",
                    "color": "#666666",
                    "wrap": true
                  }
                ]
              },
              {
                "type": "box",
                "layout": "baseline",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "text",
                    "text": "Open",
                    "flex": 1,
                    "size": "sm",
                    "color": "#AAAAAA"
                  },
                  {
                    "type": "text",
                    "text": (placeResults[place].opening_hours != null && placeResults[place].opening_hours.open_now == true) ? "Open Now" : "Closed",
                    "flex": 5,
                    "size": "sm",
                    "color": "#666666",
                    "wrap": true
                  }
                ]
              }
            ]
          };

          content.body.contents.push(box);

          var footer = {
            "type": "button",
            "action": {
              "type": "uri",
              "label": "Open Map",
              "uri": "https://www.google.co.th" //encodeURI("https://www.google.com/maps/dir/Current+Location/"+placeResults[place].geometry.location.lat+","+placeResults[place].geometry.location.lng+"")
            },
            "height": "sm",
            "style": "link"
          };
          content.footer.contents.push(footer);

          //Add to reply message
          replyMessage.contents.contents.push(content);
          total++;
    }

    //console.log(replyMessage);
    return JSON.parse(JSON.stringify(replyMessage));
}