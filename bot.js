const WebSocketServer = require('wss');
const tmi = require('tmi.js');
const fs = require('fs');
const exec = require('child_process').exec;
//////////////////////////////////////////////////////// Variables (Change this) //////////////////////////////////////////////////
// Define configuration options
const opts = {
  identity: {
    username: "", // Example: "DarkyRobotnik"
    password: ""  // Example: "password123"
  },
  channels: [     // Example: ["WTFDarky"]
  ]
};
// List your admins and Mods
let mods = ['WTFDarky', 'Toobi', 'pladdemusicjam', 'Herbstliches', 'teirii']
// Path for statics.json, which should hold all your commands. Use './statics.json' if you want to use the given example-file.
let staticsPath = '/sftp_uploads/user1/darkyrobotnikexchange/statics.json'


//////////////////////////////////////////////////////// Code //////////////////////////////////////////////////
// Enable this if you want to use the twitch-api for eventhandling
const apienabled = true
// Anwers for Bot to automatically react to random messages
let answers = [` haha, ja genau!`, ` lol, du sagst es :D`, ` ich genieße jedes einzelne dieser Worte!`, ` Da wird man ja fuchsig!`, ` das hast du doch von jemandem abgeschrieben!`, ` für die Nachricht gibt's 5 ECTS!`, ` du wirkst müde. Bestell dir doch mal einen !kaffee mit !milch!`]
let adverts = [`Du willst auch an den Präsenzveranstaltungen teilnehmen? Dann klicke hier: https://discord.gg/VaJfZVKWhK`, `Alle Hintergrundmusik wurde von Martin Platte @pladdemusicjam (https://twitter.com/PLaddeXOXO) erstellt.`, `Alle 3D-Flow-Simulationen wurden von @Toobi (https://www.twitch.tv/Toobi) erstellt.`, `Alle gezeichneten Emotes wurden von @Teirii (https://www.twitch.tv/Teirii) erstellt.`]
let currentadvert = 0;
let nextcall = new Date()

// Special variables
var statistics = {
  "deterioration": 1,
  "messagecount": 0
}

// Variables and Commandmap for riddle
let firstwinner = "@pinkfluffyfluffycorn hat das Rätsel als erstes gelöst und hat sich damit einen 10€-Steam-Gutschein verdient :)"
riddlemap = {
  "!riddle":
    "104 116 116 112 115 058 047 047 119 119 119 046 121 111 117 116 117 098 101 046 099 111 109 047 119 097 116 099 104 063 118 061 100 086 098 053 080 102 112 109 119 073 069",
  "!0765":
    "Zhofkhq Lqwhusuhwhq pxvv vlfk RWEW riw yrq Doha jhidoohq odvvhq?",
  "!eminem":
    "CompSys - The Game ist ein echt cooles Spiel... Aber was ist der Titel?",
  "!konzeption und implementierung von videospielen zur lernunterstützung in unity3d":
    "Welche Sprache spricht eigentlich Gilly?",
  "!ruby":
    "Wiki ist ein Wikinger.. Oder so.. Oder was anderes? Hauptsache heiß!.. Aber wie heiß nun eigentlich?",
  "!superhot":
    "No spaces. All lowercase. No '+'.\n Max Lieblingsspiel + OTBT-Chef-Vorname + BA-Betreuer-vorname + Gillys Lieblingsspiel + Wiki-Artikel-last-editor",
  "!maplestoryjenstimhangmandobiko":
    (target, context, msg, self) => {
      firstwinner = context['display-name'];
      client.say(target, `@${context['display-name']}, Du hast gewonnen!`);
    },
  "!firstwinner":
    firstwinner == "" ? "Bisher noch kein Gewinner :(" : firstwinner
};

// Standardcommands. Including Shoutout (usage: !so @streamername) and pullandrestart, which pulls the repo and restarts the bot.
standardmap = {
  "!so":
    (target, context, msg, self) => {
      var re = /@(?<name>\S*)/;
      let result = msg.match(re)
      if (result != null) {
        if (mods.includes(context['display-name'])) {
          client.say(target, `${result[0]} hat unsere Vorlesung gestört. Was für eine Ehre. Schaut doch auch mal die letzten Publikationen von ${result[0]} an! https://www.twitch.tv/${result['groups']['name']}`);
        }
      }
    },
  "!pullandrestart":
    (target, context, msg, self) => {
      if (mods.includes(context['display-name'])) {
        client.say(target, `Restarting...`);
        PullAndRestart()
      }
    }
}

// read opts from file
fs.readFile('opts.json', 'utf-8', (err, data) => {
  if (err) {
    console.log("Can't find opts.json. Using given opts.");
  }

  const optstemp = JSON.parse(data.toString());
  opts.identity.username = optstemp.identity.username;
  opts.identity.password = optstemp.identity.password;
  opts.channels = optstemp.channels;
});


commandmap = {
  "!reloadcommands":
    (target, context, msg, self) => {
      if (mods.includes(context['display-name'])) {
        LoadCommands()
        client.say(target, `Reload successfull!`);
      }
    },
  "!hug":
    (target, context, msg, self) => {
      var re = /@(?<name>\S*)/;
      let result = msg.match(re)
      if (result != null) {
        client.say(target, `${result[0]} wird fest von ${context['display-name']} in den Arm genommen.`);
      }
      else {
        client.say(target, `${context['display-name']} läuft wild herum und umarmt wahllos Leute. Achtung!`);
      }
    }
}

if (!fs.existsSync("./stats.json")) {
  fs.writeFile('stats.json', JSON.stringify(statistics), (err) => console.log(err));
} else {
  fs.readFile('stats.json', 'utf-8', (err, data) => {
    if (err) {
      throw err;
    }
    statistics = JSON.parse(data.toString());
  });
}
// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  statistics['messagecount'] = statistics['messagecount'] + 1;
  if (statistics['messagecount'] > 1000) {
    statistics['deterioration'] = statistics['deterioration'] + 1
    statistics['messagecount'] = 0;
  }
  // Show adverts sometimes.
  if (new Date() > nextcall) {
    asyncCall(adverts[currentadvert], 60000);
    nextcall = new Date()
    nextcall.setMinutes(nextcall.getMinutes() + 15)
    currentadvert = (currentadvert + 1) % adverts.length;
  }


  // Remove whitespace from chat message
  var re = /!\S*/;
  let result = msg.match(re)
  if (result == null) {
    randomchat = Math.floor(Math.random() * 100)
    if (randomchat < 5) {
      // Shuffle array
      var answer = answers[Math.floor(Math.random() * answers.length)]
      if (statistics['deterioration'] > 0) {
        var arr = [];
        while (arr.length < statistics['deterioration']) {
          var r = Math.floor(Math.random() * answer.length) + 1;
          if (arr.indexOf(r) === -1) arr.push(r);
        }
        for (let i = 0; i < arr.length; i++) {
          var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          var charactersLength = characters.length;
          randomletter = characters.charAt(Math.floor(Math.random() *
            charactersLength));

          answer[arr[i]] = randomletter;
        }
      }

      client.say(target, `@${context['display-name']} ` + answer);
    }
    return
  }
  const commandName = result[0].trim();
  if (commandName[0] == "!" && commandName.toLowerCase() in commandmap) {
    if (typeof commandmap[commandName.toLowerCase()] === 'function') {
      commandmap[commandName.toLowerCase()](target, context, msg, self)
    } else if (typeof commandmap[commandName.toLowerCase()] === 'string') {
      client.say(target, `@${context['display-name']} ` + commandmap[commandName.toLowerCase()]);
    }
  }
}

function LoadCommands() {
  commandmap = {
    "!reloadcommands":
      (target, context, msg, self) => {
        LoadCommands()
        client.say(target, `Reload successfull!`);
      },
    "!hug":
      (target, context, msg, self) => {
        var re = /@(?<name>\S*)/;
        let result = msg.match(re)
        if (result != null) {
          client.say(target, `${result[0]} wird fest von ${context['display-name']} in den Arm genommen.`);
        }
        else {
          client.say(target, `${context['display-name']} läuft wild herum und umarmt wahllos Leute. Achtung!`);
        }
      }
  }

  commandmap = Object.assign(commandmap, riddlemap)
  commandmap = Object.assign(commandmap, standardmap)
  fs.readFile(staticsPath, 'utf-8', (err, data) => {
    if (err) {
      throw err;
    }
    const temp = JSON.parse(data.toString());
    for (const [key, value] of Object.entries(temp.commands)) {
      commandmap[key] = value
    }
  });
}


function PullAndRestart() {
  exec('./restart.sh', (e, stdout, stderr) => {
    if (e instanceof Error) {
      console.error(e);
      throw e;
    }
    console.log('stdout ', stdout);
    console.log('stderr ', stderr);
  });
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  client.say(opts.channels[0], `Bot connected successfully!`);
}



// Option for times events
function resolveAfterNSeconds(n) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, n);
  });
}

// Starting-function for timed events. 
async function asyncCall(text, time) {
  const result = await resolveAfterNSeconds(time);
  client.say(opts.channels[0], text);
}




///////////////////////////////////////////////////// Twitch-API Eventhandler ////////////////////////////////////////////////////////
if (apienabled) {

  const crypto = require('crypto')
  const express = require('express');
  const https = require('https')
  const app = express();
  const port = 443;

  const fs = require('fs');
  var secret = ""
  try {
    // read contents of the file
    const data = fs.readFileSync('api-secret.txt', 'UTF-8');

    // split the contents by new line
    const lines = data.split(/\r?\n/);

    // print all lines
    secret = lines[0]
  } catch (err) {
    console.error(err);
  }

  // Notification request headers
  const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
  const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
  const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
  const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

  // Notification message types
  const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
  const MESSAGE_TYPE_NOTIFICATION = 'notification';
  const MESSAGE_TYPE_REVOCATION = 'revocation';

  // Prepend this string to the HMAC that's created from the message
  const HMAC_PREFIX = 'sha256=';
  const server = https
    .createServer(
      // Provide the private and public key to the server by reading each
      // file's content with the readFileSync() method.
      {
        key: fs.readFileSync("privkey.pem"),
        cert: fs.readFileSync("fullchain.pem"),
      },
      app
    )
    .listen(port, () => {
      console.log("server is running at port 443");
    });
  app.use(express.raw({          // Need raw message body for signature verification
    type: 'application/json'
  }))

  let webconnections = new Set()
  const wss = new WebSocketServer({server});
  wss.on('connection', (ws) => {
    console.log('Client connected');
    webconnections.add(ws)
    ws.on('close', () => {
      console.log('Client disconnected');
      webconnections.delete(ws)
    });
  });

  const filterlist = ["wav","ico","png","css"]
  app.get('/favicon.ico', (req,res) => {
    res.download("favicon.ico");
  });
  app.get('/:filename?', (req, res) => {
    if(req.params.filename != null){
      if(fs.existsSync(req.params.filename) && filterlist.includes(req.params.filename.slice(-3))){
        res.download(req.params.filename)
      }
    }
    else{
      res.sendFile('index.html', {root: __dirname })
    }
    })

  app.post('/eventsub', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
      console.log("signatures match");

      // Get JSON object from body, so you can process the message.
      let notification = JSON.parse(req.body);

      if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
        // TODO: Do something with the event's data.

        console.log(`Event type: ${notification.subscription.type}`);
        console.log(JSON.stringify(notification.event, null, 4));
        if(notification.subscription.type == "channel.raid"){
          client.say(opts.channels[0], `${notification.event['from_broadcaster_user_name']} hat unsere Vorlesung gestört. Was für eine Ehre. Schaut doch auch mal die letzten Publikationen von ${notification.event['from_broadcaster_user_name']} an! https://www.twitch.tv/${notification.event['from_broadcaster_user_name']}`);
        }
        if(notification.subscription.type == "channel.follow"){
          console.log("Expect sound on OBS");
          webconnections.forEach(key => key.send('follow'));
        }
        if(notification.subscription.type = "channel.channel_points_custom_reward_redemption.add"){
          console.log(`Dingens.${notification.event['reward']['title']}`);
        }
        res.sendStatus(204);
      }
      else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
        string = ""
        string = notification.challenge
        res.status(200).send(string);
      }
      else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
        res.sendStatus(204);

        console.log(`${notification.subscription.type} notifications revoked!`);
        console.log(`reason: ${notification.subscription.status}`);
        console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
      }
      else {
        res.sendStatus(204);
        console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
      }
    }
    else {
      console.log('403');    // Signatures didn't match.
      res.sendStatus(403);
    }
  })



  function getSecret() {
    // TODO: Get secret from secure storage. This is the secret you pass 
    // when you subscribed to the event.
    return secret;
  }

  // Build the message used to get the HMAC.
  function getHmacMessage(request) {
    return (request.headers[TWITCH_MESSAGE_ID] +
      request.headers[TWITCH_MESSAGE_TIMESTAMP] +
      request.body);
  }

  // Get the HMAC.
  function getHmac(secret, message) {
    return crypto.createHmac('sha256', secret)
      .update(message)
      .digest('hex');
  }

  // Verify whether our hash matches the hash that Twitch passed in the header.
  function verifyMessage(hmac, verifySignature) {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
  }




}
