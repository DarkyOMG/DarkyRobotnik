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
let mods = ['WTFDarky', 'Toobi', 'pladdemusicjam', 'Herbstliches']
// Path for statics.json, which should hold all your commands. Use './statics.json' if you want to use the given example-file.
let staticsPath = '/sftp_uploads/user1/darkyrobotnikexchange/statics.json'



//////////////////////////////////////////////////////// Code //////////////////////////////////////////////////


// Anwers for Bot to automatically react to random messages
let answers = [` haha, ja genau!`,` lol, du sagst es :D`,` ich genieße jedes einzelne dieser Worte!`, ` Da wird man ja fuchsig!`,` das hast du doch von jemandem abgeschrieben!`, ` für die Nachricht gibt's 5 ECTS!`, ` du wirkst müde. Bestell dir doch mal einen !kaffee mit !milch!`]
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
      if(result != null){
        if (mods.includes(context['display-name'])) {
          client.say(target, `${result[0]} hat unsere Vorlesung gestört. Was für eine Ehre. Schaut doch auch mal die letzten Publikationen von ${result[0]} an! https://www.twitch.tv/${result['groups']['name']}`);
        }
      }
    },
    "!pullandrestart":
    (target,context,msg,self) => {
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
    }
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
  // Remove whitespace from chat message
  var re = /!\S*/;
  let result = msg.match(re) 
  if(result == null){
    randomchat =  Math.floor(Math.random() * 100)
    if(randomchat < 5){
      client.say(target, `@${context['display-name']} ` + answers[Math.floor(Math.random()*answers.length)]);
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
  exec('./restart.sh', (e,stdout,stderr)=> {
    if(e instanceof Error) {
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
async function asyncCall() {
  console.log('calling');
  const result = await resolveAfterNSeconds(10000);
  client.say(opts.channels[0], "This is a test after 10 seconds");
  // expected output: "resolved"
}







