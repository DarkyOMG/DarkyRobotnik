const WebSocketServer = require('wss');
const tmi = require('tmi.js');
const fs = require('fs');
const exec = require('child_process').exec;
const { getAudioDurationInSeconds } = require('get-audio-duration')
let webconnections = new Set()
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
const auths = {
  Authorization: "",
  ClientId: ""
}
// List your admins and Mods
let mods = ['WTFDarky', 'Toobi', 'pladdemusicjam', 'Herbstliches', 'teirii','earth_dragon_pax'];
// Path for statics.json, which should hold all your commands. Use './statics.json' if you want to use the given example-file.
let staticsPath = '/sftp_uploads/user1/darkyrobotnikexchange/statics.json'
let alerts = true;

//////////////////////////////////////////////////////// Code //////////////////////////////////////////////////
// Enable this if you want to use the twitch-api for eventhandling
const apienabled = true
// Anwers for Bot to automatically react to random messages
let answers = [` haha, ja genau!`,` lol, du sagst es :D`, ` ich genieße jedes einzelne dieser Worte!`, ` Da wird man ja fuchsig!`, ` das hast du doch von jemandem abgeschrieben!`, ` für die Nachricht gibt's 5 ECTS!`, ` du wirkst müde. Bestell dir doch mal einen !kaffee mit !milch!`,` haha, ja gleich bist du tot!`,` lol, du schweigst gleich :D`, ` ich genieße jedes einzelne deiner Haare!`, ` Da wird man ja fu..fuuaAHAHahhahh!`, ` das hast du doch von jemandem abgeschnitten!`, ` für die Nachricht gibt's 5 Peitschenhiebe!`, ` du wirkst müde. Bestell dir doch mal einen !Affenkopf mit !Eis!`]
// Adverts the bot says periodically while there are still chatters.
let adverts = [`Du willst auch an den Präsenzveranstaltungen teilnehmen? Dann klicke hier: https://discord.gg/VaJfZVKWhK`, `Alle Hintergrundmusik wurde von Martin Platte @pladdemusicjam (https://www.instagram.com/die_pladde/) erstellt.`, `Alle 3D-Flow-Simulationen wurden von @Toobi (https://www.twitch.tv/Toobi) erstellt.`, `Alle gezeichneten Emotes wurden von @Teirii (https://www.twitch.tv/Teirii) erstellt.`]
let currentadvert = 0;
let nextcall = new Date()

// Special variables for secret feature
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
function GetClips(raidername,data,headers){
  console.log(data);
  endpoint = `https://api.twitch.tv/helix/clips?broadcaster_id=${data.id}`

  console.log(endpoint);
  fetch(endpoint, {
  headers,
  })
  .then((res) => res.json())
  .then((data) => console.log(data));
  
}
// Standardcommands. Including Shoutout (usage: !so @streamername) and pullandrestart, which pulls the repo and restarts the bot.
standardmap = {
  "!so":
    (target, context, msg, self) => {
      var re = /@(?<name>\S*)/;
      let result = msg.match(re)
      if (result != null) {
        if (mods.includes(context['display-name'])) {
          client.say(target, `${result[0]} hat unsere Vorlesung gestört. Was für eine Ehre. Schaut doch auch mal die letzten Publikationen von ${result[0]} an! https://www.twitch.tv/${result['groups']['name']}`);
          let headers = {
            "Authorization": auths.Authorization,
            "Client-Id": auths.ClientId
          };
          let endpoint = `https://api.twitch.tv/helix/users?login=${result[0].slice(1)}`
          
          fetch(endpoint, {
            headers,
            })
            .then((res) => res.json())
            .then((data) => GetClips(result[0],data,headers))
        }
      }
    },
  "!alerts":
    (target, context, msg, self) => {
      if (mods.includes(context['display-name'])) {
        alerts = !alerts;
        client.say(target, `Followeralerts are ${alerts?"On":"Off"} `);
      }
  },
  "!pullandrestart":
    (target, context, msg, self) => {
      if (mods.includes(context['display-name'])) {
        client.say(target, `Restarting...`);
        PullAndRestart()
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
    },
  "!stats":
    (target, context, msg, self) => {
      client.say(target, `Stats: Secret:${statistics['deterioration']}, Messages since last start: ${statistics['messagecount']}`);
    },
  "!flood":
  (target,context,msg,self) => {
    asyncCall("#sdaFLUFFYÄsf3",1000);
    asyncCall("Dm4kA 1§fg6! vvsPAXhhhh",8000);
    asyncCall("Wp B1PLADDEs| Ðü¿",15000);
    asyncCall("Haa$HERBSTIHa Gl#0cj hjob icn Dikh!!§=",20000);
    asyncCall("H11f333SCARLETT333!!==?",30000);
    asyncCall("DROP TABLE DARKYRYANNECKOBOTNIK",31000);
    asyncCall("DELETE DATABASE DARKYROBSVENJAOTNIK",32000);
    asyncCall("٩(̾●̮̮̃̾•̃̾)۶ BUTCHER ٩(̾●̮̮̃̾•̃̾)۶",40000);
    asyncCall("٩(- ̮̮̃-̃)۶ LIN ٩(- ̮̮̃-̃)۶",41000);
    asyncCall("(-(-_TEIRII(-_-)MICHEL_-)-)",42000);
    asyncCall("(-(-_ALEXPIRCH(-_-)PAFFUS_-)-)",43000);
    asyncCall("(-(-_MADDIN(-_-)TOBI_-)-)",44000);
    asyncCall("WäcsnmHOSEnasd da093 ad,a!da00ß(",55000);
    asyncCall("KONGTTANKERINGNÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ",57000);
    asyncCall("KonFstifDROTAKgüüÜ*Ü*üüääÄÜ*Ü0ÜÜ*5",57500);
    asyncCall("Whi1i11iECLIPSEh2iihihdei1i1i1",58000);
    asyncCall("Ihr alle seid.. ",58500);
    asyncCall("TOT",59000);
    asyncCall("DIE BESTEN",59500);
    asyncCall("BÄ24ÄBÄüpüBESTEN haTOThahahaaahahhha##'Asd++234f#ä..#äsdfsd",60000);
    asyncCall("..........",60000);
  }  
}

commandmap = {
  "!reloadcommands":
    (target, context, msg, self) => {
      if (mods.includes(context['display-name'])) {
        LoadCommands()
        client.say(target, `Reload successfull!`);
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
  auths.Authorization = optstemp.auth;
  auths.ClientId = optstemp.clientid;
});

if (!fs.existsSync("./stats.json")) {
  fs.writeFile('stats.json', JSON.stringify(statistics), (err) => console.log(err));
} else {
  fs.readFile('stats.json', 'utf-8', (err, data) => {
    if (err) {
      throw err;
    }
    statistics['deterioration'] = JSON.parse(data.toString())['deterioration'];

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
  // Message counting for secret feature.
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

  // Check if a command has been called. Commands start with "!".
  var re = /!\S*/;
  let result = msg.match(re)

  // If no command has been called, randomly answer chatters with predefined messages.
  if (result == null) {
    // Answer if a random number between 1 and 100 is below 5.
    randomchat = Math.floor(Math.random() * 100)
    if (randomchat < 5) {
      // Shuffle array to pick a random answer
      var answer = answers[Math.floor(Math.random() * answers.length)]

      // Secret feature. You can delete this if-clause part.
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
  // If a command was found, this part is triggered.
  const commandName = result[0].trim();
  // Check if the command is valid and belongs to this commandmap
  if (commandName[0] == "!" && commandName.toLowerCase() in commandmap) {
    // The commandmap has either strings or functions. If it is a function, invoke it. Otherwise just post the string in the chat.
    if (typeof commandmap[commandName.toLowerCase()] === 'function') {
      commandmap[commandName.toLowerCase()](target, context, msg, self)
    } else if (typeof commandmap[commandName.toLowerCase()] === 'string') {
      client.say(target, `@${context['display-name']} ` + commandmap[commandName.toLowerCase()]);
    }
  }
}
// Function to load all given commands by the standardmap and the statics.json file into the active commandmap.
function LoadCommands() {
  commandmap = {
    "!reloadcommands":
      (target, context, msg, self) => {
        LoadCommands()
        client.say(target, `Reload successfull!`);
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

// Function to call a script that pulls the current repository and restarts the bot.
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

// Function to call a function asynchronously.
async function asnycFuncCall(func, time) {
  const restult = await resolveAfterNSeconds(600000)
  fs.writeFile('stats.json', JSON.stringify(statistics), (err) => console.log(err));
}

// Starting-function for timed events posts (e.g. Adverts) 
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
  // Standard port for https communication. Change this if needed.
  const port = 443;

  const fs = require('fs');

  // Read in the secret of the server. This can be any random string, but must be kept secret. (e.g. "thisisasecret" or "s92bd8nsu9a892nf8")
  // It is used to identify authorized events.
  var secret = ""
  // I save my secret in a file called api-secret.txt. If you don't want to use the same schema, just delete this try-catch block and write the
  // secret into the variable above.
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

  // This part is given by Twitch and is needed for certain identifications of message-parts. Nothing to change here.

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



  // Important: To use your own handler, you must enable https on your webserver. To do so, you need to give a CA-signed certificate.
  // The files needed from this certification are privkey.pem and fullchain.pem. 
  // To get these files, I used https://certbot.eff.org/ (https://certbot.eff.org/instructions for a detailed explanation).

  const server = https
    .createServer(
      // Provide the private and public key to the server by reading each
      // file's content with the readFileSync() method.
      {
        key: fs.readFileSync("/etc/letsencrypt/live/muskatnuss.duckdns.org/privkey.pem"),
        cert: fs.readFileSync("/etc/letsencrypt/live/muskatnuss.duckdns.org/fullchain.pem"),
      },
      app
    )
    .listen(port, () => {
      console.log(`server is running at port ${port}`);
    });
  app.use(express.raw({          // Need raw message body for signature verification
    type: 'application/json'
  }))


  // This server also serves as a websocketserver for different websockets. This can be used to send events to webclients or other websockets.
  // This set will contain all open websocket-connections
  

  // Starting the webserver onto the already started https server to be able to use secure websocketserving. 
  // This is only needed if you want to fire your own alerts on-stream.
  const wss = new WebSocketServer({ server });
  // Standard schema for usage of the webserver. wss.on('eventname')... will execute when a message reaches the websocketserver with message 'eventname'.
  wss.on('connection', (ws) => {
    console.log('Client connected');
    webconnections.add(ws)
    ws.on('close', () => {
      console.log('Client disconnected');
      webconnections.delete(ws)
    });
  });

  // For certain purposes, we need to be able to download files. These are all the file-types that are openly downloadable.
  const filterlist = ["wav", "ico", "png", "css", "gif"]

  // Downloading files on root-level like the icon or just access the main page.
  app.get('/:filename?', (req, res) => {
    if (req.params.filename != null) {
      if (fs.existsSync(req.params.filename) && filterlist.includes(req.params.filename.slice(-3))) {
        res.download(req.params.filename);
      }
    }
    else {
      res.sendFile('index.html', { root: __dirname });
    }
  })

  // Rootfolder for all downloadable content, such as images or clips
  let folderroot = '/sftp_uploads/user1/'

  // Download images or clips using the folderroot and given folders. This is used for browser-alerts and such.
  app.get('/:folder/:filename', (req, res) => {
    if (req.params.filename != null) {
      if (fs.existsSync(folderroot + req.params.folder + "/" + req.params.filename) && filterlist.includes(req.params.filename.slice(-3))) {
        res.download(folderroot + req.params.folder + "/" + req.params.filename);
      }
    }
  })


  // Main twitch-event subscription message. This will trigger whenever a twitch-event has been triggered.
  // To subscribe to events you need to have an app-access token and a client-ID. 
  // On how to subscribe to events check the documentation: https://dev.twitch.tv/docs/eventsub
  app.post('/eventsub', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
      console.log("signatures match");

      // Get JSON object from body, so you can process the message.
      let notification = JSON.parse(req.body);

      // Main segment for event-handling
      if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
        console.log(`Event type: ${notification.subscription.type}`);
        console.log(JSON.stringify(notification.event, null, 4));
        // Here different events are handled differently. The subscription type is used to identify which kind of event happened.
        if (notification.subscription.type == "channel.raid") {
          // Give a shoutout to whoever raided the channel.
          client.say(opts.channels[0], `${notification.event['from_broadcaster_user_name']} hat unsere Vorlesung gestört. Was für eine Ehre. Schaut doch auch mal die letzten Publikationen von ${notification.event['from_broadcaster_user_name']} an! https://www.twitch.tv/${notification.event['from_broadcaster_user_name']}`);
          // Also send a notification with all important information to all connected websockets
          webconnections.forEach(key => key.send('raid' + notification.event['from_broadcaster_user_name'] + ':' + notification.event['viewers']));
        }

        if (notification.subscription.type == "channel.follow") {
          if(alerts) webconnections.forEach(key => key.send('follow' + notification.event['user_name']));
        }
        // This event is triggered whenever a viewer redeems a custom reward. 
        if (notification.subscription.type == "channel.channel_points_custom_reward_redemption.add") {
          // You can further filter the event by it's title
          if (notification.event['reward']['title'] == "Ich bin da!"){
            var filename = ""
            if(fs.existsSync(folderroot+'clips/'+notification.event['user_name']+'.wav')){
              filename = notification.event['user_name'];
            } else {
              filename = "default";
            }
            getAudioDurationInSeconds(folderroot+'clips/'+filename+'.wav').then((duration) => {
              duration = Math.ceil(duration);
              durationstring = duration <10? "0"+duration.toString() : duration.toString();
              webconnections.forEach(key => key.send('anim' + durationstring + filename));
            })
          }
          
          if (notification.event['reward']['title'].slice(0, 4) == "Clip") {
            getAudioDurationInSeconds(folderroot+'clips/'+notification.event['reward']['title'].slice(6)+'.wav').then((duration) => {
              duration = Math.ceil(duration);
              durationstring = duration <10? "0"+duration.toString() : duration.toString();
              webconnections.forEach(key => key.send('clip' + durationstring + notification.event['reward']['title'].slice(6)));
            })
            }
          if(notification.event['reward']['title'].slice(0,9) == "Animation"){
            getAudioDurationInSeconds(folderroot+'clips/'+notification.event['reward']['title'].slice(11)+'.wav').then((duration) => {
              duration = Math.ceil(duration);
              durationstring = duration <10? "0"+duration.toString() : duration.toString();
              webconnections.forEach(key => key.send('anim' + durationstring + notification.event['reward']['title'].slice(11)));
            })
          }
        }
        // This sends a "OK" signal to Twitch, indicating that the event has been received.
        res.sendStatus(204);
      }

      // This needs to be implemented for twitch to verify and revoke your subscription, but doens't need to be changed.
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

