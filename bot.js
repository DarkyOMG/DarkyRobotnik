const WebSocketServer = require('wss');
const tmi = require('tmi.js');
const fs = require('fs');
const exec = require('child_process').exec;
const { getAudioDurationInSeconds } = require('get-audio-duration')
const WEBCONNECTIONS = new Set()
//////////////////////////////////////////////////////// Variables (Change this) //////////////////////////////////////////////////
// Define configuration options
const OPTS = {
  identity: {
    username: "", // Example: "DarkyRobotnik"
    password: ""  // Example: "password123"
  },
  channels: [     // Example: ["WTFDarky"]
  ]
};
const AUTHS = {
  Authorization: "",
  ClientId: ""
}
let COLORS = {};
// List your admins and Mods.
const MODS = ['WTFDarky', 'Toobi', 'pladdemusicjam', 'Herbstliches', 'teirii', 'pinkfluffyfluffycorn', 'orangeautumnleaf'];
const RAINBOWUSERSDONE = [];
// Path for statics.json, which should hold all your commands. Use './statics.json' if you want to use the given example-file.
const STATICSPATH = '/sftp_uploads/user1/darkyrobotnikexchange/statics.json'
// Used to prevent Follow-botting. If false, no Follow-Alerts will be triggered. Can be Changed at runtime with "!alerts" command.
let ALERTS = true;
// If true, logs will include a lot of infos about Events that are triggered.
const VERBOSE = false;
// Enable this if you want to use the twitch-api for eventhandling.
const APIENABLED = true
// Anwers for Bot to automatically react to random messages.
const ANSWERS = [` haha, ja genau!`, ` lol, du sagst es :D`, ` ich genieße jedes einzelne dieser Worte!`, ` Da wird man ja fuchsig!`, ` das hast du doch von jemandem abgeschrieben!`, ` für die Nachricht gibt's 5 ECTS!`, ` du wirkst müde. Bestell dir doch mal einen !kaffee mit !milch!`, ` haha, ja gleich bist du tot!`, ` lol, du schweigst gleich :D`, ` ich genieße jedes einzelne deiner Haare!`, ` Da wird man ja fu..fuuaAHAHahhahh!`, ` das hast du doch von jemandem abgeschnitten!`, ` für die Nachricht gibt's 5 Peitschenhiebe!`, ` du wirkst müde. Bestell dir doch mal einen !Affenkopf mit !Eis!`]
// Adverts the bot says periodically while there are still chatters.
const ADVERTS = [`Du willst auch an den Präsenzveranstaltungen teilnehmen? Dann klicke hier: https://discord.gg/VaJfZVKWhK`, `Alle Hintergrundmusik wurde von Martin Platte @pladdemusicjam (https://www.instagram.com/die_pladde/) erstellt.`, `Alle 3D-Flow-Simulationen wurden von @Toobi (https://www.twitch.tv/Toobi) erstellt.`, `Alle gezeichneten Emotes wurden von @Teirii (https://www.twitch.tv/Teirii) erstellt.`]

//////////////////////////////////////////////////////// Code //////////////////////////////////////////////////
let CURRENTADVERT = 0;
let NEXTCALL = new Date()


// Standardcommands which are loaded and not changed during runtime
const COMMANDMAP = {
  "!reloadcommands":
    (target, context, msg, self) => {
      if (MODS.includes(context['display-name'])) {
        loadCommands()
        client.say(target, `Reload successfull!`);
      }
    },
  "!so":
    (target, context, msg, self) => {
      var re = /@(?<name>\S*)/;
      let result = msg.match(re)
      if (result != null) {
        if (MODS.includes(context['display-name'])) {
          client.say(target, `${result[0]} hat unsere Vorlesung gestört. Was für eine Ehre. Schaut doch auch mal die letzten Publikationen von ${result[0]} an! https://www.twitch.tv/${result['groups']['name']}`);
          let headers = {
            "Authorization": AUTHS.Authorization,
            "Client-Id": AUTHS.ClientId
          };
          let endpoint = `https://api.twitch.tv/helix/users?login=${result[0].slice(1)}`

          fetch(endpoint, {
            headers,
          })
            .then((res) => res.json())
            .then((data) => GetClips(result[0], data, headers))
        }
      }
      // Functions used by !so to get clip-Data from the raiding Streamer
      function GetClips(raidername, data, headers) {
        endpoint = `https://api.twitch.tv/helix/clips?broadcaster_id=${data["data"][0]["id"]}`
        fetch(endpoint, {
          headers,
        })
          .then((res) => res.json())
          .then((data) => ShowClip(raidername, data));
      }
      function ShowClip(raidername, clips) {
        if (clips["data"].length <= 0) return;
        var clip = clips["data"][Math.floor(Math.random() * clips["data"].length)];
        WEBCONNECTIONS.forEach(key => key.send(`so;${raidername};${clip["id"]};${(clip["duration"] + 3) * 1000.0}`))
      }
    },
  "!alerts":
    (target, context, msg, self) => {
      if (MODS.includes(context['display-name'])) {
        ALERTS = !ALERTS;
        client.say(target, `Followeralerts are ${ALERTS ? "On" : "Off"} `);
      }
    },
  "!resetrainbow":
    (target, context, msg, self) => {
      if (MODS.includes(context['display-name'])) {
        RAINBOWUSERSDONE.length = 0;
        client.say(target, `Rainbow is reset`);
      }
    },
  "!redrawrainbow":
    (target, context, msg, self) => {
      if (MODS.includes(context['display-name'])) {
        redrawRainbow();
        client.say(target, `Redrawing rainbow..`);
      }
    },
  "!pullandrestart":
    (target, context, msg, self) => {
      if (MODS.includes(context['display-name'])) {
        client.say(target, `Restarting...`);
        pullAndRestart()
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
  "!color":
    (target, context, msg, self) => {
      if (msg.split(" ").length != 2) return;
      if (!isValidHex(msg.split(" ")[1])) {
        client.say(target, `${context['display-name']}, ${msg.split(" ")[1]} ist leider keine Farbe. Bitte gib deine Farbe in der Form #A61E2f (Hex) an. Farben picken kannst du hier: https://htmlcolorcodes.com/color-picker/`);
        return;
      }
      COLORS[context['display-name'].toLowerCase()] = msg.split(" ")[1];
      fs.writeFile('colors.json', JSON.stringify(COLORS), err => {
        if (err) {
          console.error(err);
        }
        // file written successfully
      });
      client.say(target, `${context['display-name']}, verstanden. Deine Farbe ist jetzt ${msg.split(" ")[1]}`);
    },
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
    ", Du hast gewonnen!"
}
// Load Opts and Colors for the Bot to connect with
loadColorsAndOpts();
// Create a client with our options
const client = new tmi.client(OPTS);
// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
// Connect to Twitch:
client.connect();

// read opts and Colors from file
function loadColorsAndOpts() {
  fs.readFile('opts.json', 'utf-8', (err, data) => {
    if (err) {
      debugLog("Can't find opts.json. Using given opts.");
    }

    const optstemp = JSON.parse(data.toString());
    OPTS.identity.username = optstemp.identity.username;
    OPTS.identity.password = optstemp.identity.password;
    OPTS.channels = optstemp.channels;
    AUTHS.Authorization = optstemp.auth;
    AUTHS.ClientId = optstemp.clientid;
  });
  fs.readFile('colors.json', 'utf-8', (err, data) => {
    if (err) {
      debugLog("Can't find colors.json.");
      return;
    }

    COLORS = JSON.parse(data.toString());
  });
}

// Function to load all given commands by the standardmap and the statics.json file into the active commandmap.
function loadCommands() {
  fs.readFile(STATICSPATH, 'utf-8', (err, data) => {
    if (err) {
      throw err;
    }
    const temp = JSON.parse(data.toString());
    for (const [key, value] of Object.entries(temp.commands)) {
      COMMANDMAP[key] = value
    }
  });
}
// Function to call a script that pulls the current repository and restarts the bot.
function pullAndRestart() {
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
  debugLog(`* Connected to ${addr}:${port}`);
  client.say(OPTS.channels[0], `Bot connected successfully!`);
}
// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Show adverts sometimes.
  if (new Date() > NEXTCALL) {
    startOrRefreshAdverts();
  }
  // Check if User is sub and wiggle it's block if present.
  wiggleSubBlock();


  // Check if a command has been called. Commands start with "!".
  const re = /!\S*/;
  const result = msg.match(re)

  // If no command has been called, randomly answer chatters with predefined messages.
  if (result == null) {
    answerRandomly();
    return
  }

  // If a command was found, this part is triggered.
  ExecuteCommand();

  function startOrRefreshAdverts() {
    asyncCall(ADVERTS[CURRENTADVERT], 60000);
    NEXTCALL = new Date();
    NEXTCALL.setMinutes(NEXTCALL.getMinutes() + 15);
    CURRENTADVERT = (CURRENTADVERT + 1) % ADVERTS.length;
  }
  function wiggleSubBlock() {
    if (RAINBOWUSERSDONE.indexOf(context['display-name'].toLowerCase()) != -1) {
      WEBCONNECTIONS.forEach(key => key.send('wiggle;' + context['display-name'].toLowerCase()));
    }
  }
  function answerRandomly() {
    // Answer if a random number between 1 and 100 is below 5.
    randomchat = Math.floor(Math.random() * 100);
    if (randomchat < 3) {
      // Shuffle array to pick a random answer
      var answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
      client.say(target, `@${context['display-name']} ` + answer);
    }
  }
  function ExecuteCommand() {
    const commandName = result[0].trim();
    // Check if the command is valid and belongs to this commandmap
    if (commandName[0] == "!" && commandName.toLowerCase() in COMMANDMAP) {
      // The commandmap has either strings or functions. If it is a function, invoke it. Otherwise just post the string in the chat.
      if (typeof COMMANDMAP[commandName.toLowerCase()] === 'function') {
        COMMANDMAP[commandName.toLowerCase()](target, context, msg, self);
      } else if (typeof COMMANDMAP[commandName.toLowerCase()] === 'string') {
        client.say(target, `@${context['display-name']} ` + COMMANDMAP[commandName.toLowerCase()]);
      }
    }
  }
}
// Option for times events
function resolveAfterNSeconds(n) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, n);
  });
}
// Starting-function for timed events posts (e.g. Adverts) 
async function asyncCall(text, time) {
  const result = await resolveAfterNSeconds(time);
  client.say(OPTS.channels[0], text);
}
///////////////////////////////////////////////////// Twitch-API Eventhandler ////////////////////////////////////////////////////////
if (APIENABLED) {

  const crypto = require('crypto')
  const express = require('express');
  const https = require('https')
  const app = express();
  // Standard port for https communication. Change this if needed.
  const port = 443;

  // Read in the secret of the server. This can be any random string, but must be kept secret. (e.g. "thisisasecret" or "s92bd8nsu9a892nf8")
  // It is used to identify authorized events.
  var secret = ""
  // I save my secret in a file called api-secret.txt. If you don't want to use the same schema, just delete this try-catch block and write the
  // secret into the variable above.
  try {
    // read contents of the file
    const data = fs.readFileSync('api-secret.txt', 'UTF-8');
    secret = data.trim();
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
      debugLog(`server is running at port ${port}`);
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
    debugLog('Client connected');
    WEBCONNECTIONS.add(ws)
    ws.on('close', () => {
      debugLog('Client disconnected');
      WEBCONNECTIONS.delete(ws)
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

  let overlaplist = ["C", "D", "E", "F", "G", "H", "A", "Clap"]

  // Main twitch-event subscription message. This will trigger whenever a twitch-event has been triggered.
  // To subscribe to events you need to have an app-access token and a client-ID. 
  // On how to subscribe to events check the documentation: https://dev.twitch.tv/docs/eventsub
  app.post('/eventsub', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {

      // Get JSON object from body, so you can process the message.
      let notification = JSON.parse(req.body);

      // Main segment for event-handling
      if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
        debugLog(`Event type: ${notification.subscription.type}`);
        debugLog(JSON.stringify(notification.event, null, 4));
        // Here different events are handled differently. The subscription type is used to identify which kind of event happened.
        if (notification.subscription.type == "channel.raid") {
          // Give a shoutout to whoever raided the channel.
          client.say(OPTS.channels[0], `${notification.event['from_broadcaster_user_name']} hat unsere Vorlesung gestört. Was für eine Ehre. Schaut doch auch mal die letzten Publikationen von ${notification.event['from_broadcaster_user_name']} an! https://www.twitch.tv/${notification.event['from_broadcaster_user_name']}`);
          // Also send a notification with all important information to all connected websockets
          WEBCONNECTIONS.forEach(key => key.send('raid' + ";" + notification.event['from_broadcaster_user_name'] + ';' + notification.event['viewers']));
        }

        if (notification.subscription.type == "channel.follow") {
          if (ALERTS) WEBCONNECTIONS.forEach(key => key.send('follow' + ";" + notification.event['user_name']));
        }
        // This event is triggered whenever a viewer redeems a custom reward. 
        if (notification.subscription.type == "channel.channel_points_custom_reward_redemption.add") {
          // You can further filter the event by it's title
          if (notification.event['reward']['title'] == "Ich bin da!") {
            var filename = ""
            if (fs.existsSync(folderroot + 'clips/' + notification.event['user_name'] + '.wav')) {
              filename = notification.event['user_name'];
            } else {
              filename = "default";
            }
            getAudioDurationInSeconds(folderroot + 'clips/' + filename + '.wav').then((duration) => {
              duration = Math.ceil(duration);
              durationstring = duration < 10 ? "0" + duration.toString() : duration.toString();
              WEBCONNECTIONS.forEach(key => key.send('anim' + ";" + durationstring + ";" + filename));
            })
            let headers = {
              "Authorization": AUTHS.Authorization,
              "Client-Id": AUTHS.ClientId
            };
            var broadcaster_id = '75099671'
            let endpoint = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcaster_id}&first=100`

            fetch(endpoint, {
              headers,
            })
              .then((res) => res.json())
              .then((data) => synchronizeRainbow(data, notification.event['user_name']))
          }

          if (notification.event['reward']['title'].slice(0, 4) == "Clip") {
            var rewardtitle = 'clip'
            var filename = notification.event['reward']['title'].slice(6)
            if (overlaplist.includes(notification.event['reward']['title'].slice(6))) {
              rewardtitle = 'over'
              if (fs.existsSync(folderroot + 'clips/' + notification.event['user_name'] + filename + '.wav')) {
                filename = notification.event['user_name'] + filename;
              }
            }
            getAudioDurationInSeconds(folderroot + 'clips/' + filename + '.wav').then((duration) => {
              duration = Math.ceil(duration);
              durationstring = duration < 10 ? "0" + duration.toString() : duration.toString();
              WEBCONNECTIONS.forEach(key => key.send(rewardtitle + ";" + durationstring + ";" + filename));
            })
          }
          if (notification.event['reward']['title'].slice(0, 9) == "Animation") {
            getAudioDurationInSeconds(folderroot + 'clips/' + notification.event['reward']['title'].slice(11) + '.wav').then((duration) => {
              duration = Math.ceil(duration);
              durationstring = duration < 10 ? "0" + duration.toString() : duration.toString();
              WEBCONNECTIONS.forEach(key => key.send('anim' + ";" + durationstring + ";" + notification.event['reward']['title'].slice(11)));
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

        debugLog(`${notification.subscription.type} notifications revoked!`);
        debugLog(`reason: ${notification.subscription.status}`);
        debugLog(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
      }
      else {
        res.sendStatus(204);
        debugLog(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
      }
    }
    else {
      debugLog('403');    // Signatures didn't match.
      res.sendStatus(403);
    }
  })

  function getSecret() {
    // TODO: Get secret from secure storage. This is the secret you pass 
    // when you subscribed to the event.
    return secret;
  }
  function synchronizeRainbow(data, username) {
    data["data"].forEach(element => {
      if (element['user_name'] == username) {
        if (username.toLowerCase() in COLORS) {
          WEBCONNECTIONS.forEach(key => key.send('rainbow' + ";" + COLORS[username.toLowerCase()] + ";" + username.toLowerCase()));
          RAINBOWUSERSDONE.push(username.toLowerCase());
        }
      }
    });
  }
  function redrawRainbow() {
    RAINBOWUSERSDONE.forEach(function (username) {
      WEBCONNECTIONS.forEach(key => key.send('rainbow' + ";" + COLORS[username.toLowerCase()] + ";" + username.toLowerCase()));
    })
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


  function isValidHex(color) {
    var rex = /^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$/
    var result = color.match(rex);
    return result != null;
  }
  // Verify whether our hash matches the hash that Twitch passed in the header.
  function verifyMessage(hmac, verifySignature) {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
  }
}
// Change Debug-log function to enable or disable debug-Messages.
function debugLog(textmessage) {
  if (VERBOSE) console.log(textmessage);
}

