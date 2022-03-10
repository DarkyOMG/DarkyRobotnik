const fs = require('fs');

function ConvertToJson(dict,name){
    var temp = JSON.stringify(dict)
    fs.writeFile(name+'.json', temp, (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });
}

commandmap = {
    commands : {
    "!game" : 
      "Current game Info",
    "!diesdas" : 
      "Lol",
    }
    };

ConvertToJson(commandmap,"riddle")