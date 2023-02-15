let headers = {
    "Authorization": "Bearer z6895wj61ievm17hv4ebe0vnydt37g",
    "Client-Id": "lveooi51nduduwxs1txz5y9o4qcbsg"
  };
  let endpoint = `https://api.twitch.tv/helix/users?login=wtfdarky`
  
  fetch(endpoint, {
    headers,
    })
    .then((res) => res.json())
    .then((data) => GetClips("wtfdarky",data,headers))



    function GetClips(raidername,data,headers){
        console.log(data["data"][0]["id"]);
        
        endpoint = `https://api.twitch.tv/helix/clips?broadcaster_id=${data["data"][0]["id"]}`
      
        console.log(endpoint);
        fetch(endpoint, {
        headers,
        })
        .then((res) => res.json())
        .then((data) => ShowClip(raidername,data));
      }
      function ShowClip(raidername,clips){
        var clipcount = clips["data"].length
        console.log(clipcount);
        //webconnections.forEach(key => key.send(`so ${raidername} ${data["data"][0]["id"]} ${data["data"][0]["duration"]}`)))
      }