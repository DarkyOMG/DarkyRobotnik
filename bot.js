//const tmi = require('tmi.js');
const fs = require('fs');

// Define configuration options
const opts = {
  identity: {
    username: "",
    password: ""
  },
  channels: [
  ]
};

let firstwinner = ""
riddlemap = {
  "!riddle" : 
    "104 116 116 112 115 058 047 047 119 119 119 046 121 111 117 116 117 098 101 046 099 111 109 047 119 097 116 099 104 063 118 061 100 086 098 053 080 102 112 109 119 073 069",
  "!0765" : 
    "Zhofkhq Lqwhusuhwhq pxvv vlfk RWEW riw yrq Doha jhidoohq odvvhq?",
  "!eminem" :
    "CompSys - The Game ist ein echt cooles Spiel... Aber was ist der Titel?",
  "!konzeption und implementierung von videospielen zur lernunterstützung in unity3d" : 
    "Welche Sprache spricht eigentlich Gilly?",
  "!ruby" :
    "Wiki ist ein Wikinger.. Oder so.. Oder was anderes? Hauptsache heiß!.. Aber wie heiß nun eigentlich?",
  "!superhot" :
    "No spaces. All lowercase. No '+'.\n Max Lieblingsspiel + OTBT-Chef-Vorname + BA-Betreuer-vorname + Gillys Lieblingsspiel + Wiki-Artikel-last-editor",
  "!maplestoryjenstimhangmandobiko" : 
  (target,context,msg,self) => {
    firstwinner = context['display-name'];
    client.say(target, `@${context['display-name']}, Du hast gewonnen!`);
  },
  "!firstwinner":
  firstwinner == ""? "Bisher noch kein Gewinner :(" : firstwinner
};
// Change
// read opts from file
fs.readFile('opts.json', 'utf-8', (err, data) => {
  if (err) {
      throw err;
  }

  const optstemp = JSON.parse(data.toString());
  opts.identity.username = optstemp.identity.username;
  opts.identity.password = optstemp.identity.password;
  opts.channels = optstemp.channels;
});
commandmap = {
  "!reloadcommands":
  (target,context,msg,self) => {
    if(context['display-name'] == 'WTFDarky'){
      LoadCommands()
      client.say(target, `Reload successfull!`);
    }
  }
}

// Create a client with our options
//const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();



//console.log(re.match(string));
// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  // Remove whitespace from chat message


  var re = /(?<raider>\S+) raidet mit einer Gruppe von \d+ Personen./;
  let result = msg.match(re)
  if(result != null){
    if(context['display-name'] == ""){
      client.say(target, `@${result[1]} hat die Vorlesung mit einer Schar wilder Studenten gestört! Schaut doch (aus Rache) mal dort vorbei!`);
    }
    console.log(result[1])
  }
  console.log(msg);
  const commandName = msg.trim();
  if(commandName[0] == "!" && commandName.toLowerCase() in commandmap){
    if(typeof commandmap[commandName.toLowerCase()] === 'function'){
      commandmap[commandName.toLowerCase()](target,context,msg,self)
    } else if(typeof commandmap[commandName.toLowerCase()] === 'string'){
      client.say(target, `@${context['display-name']} `+ commandmap[commandName.toLowerCase()]);
    }
  } else {
    console.log(`* Unknown command ${commandName}`);
  }
}

function LoadCommands() {
  commandmap = {
    "!reloadcommands":
    (target,context,msg,self) => {
      LoadCommands()
      client.say(target, `Reload successfull!`);
    }
  }

  commandmap = Object.assign(commandmap, riddlemap)
  fs.readFile('/sftp_uploads/user1/darkyrobotnikexchange/statics.json', 'utf-8', (err, data) => {
    if (err) {
      throw err;
    }
    const temp = JSON.parse(data.toString());
    for (const [key, value] of Object.entries(temp.commands)) {
      commandmap[key] = value
    }
    console.log(commandmap)
  });
}
// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}




function resolveAfterNSeconds(n) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, n);
  });
}

async function asyncCall() {
  console.log('calling');
  const result = await resolveAfterNSeconds(10000);
  client.say(opts.channels[0], "This is a test after 10 seconds");
  // expected output: "resolved"
}


console.log(commandmap)






