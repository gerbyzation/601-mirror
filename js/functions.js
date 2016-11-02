
var allCameras = [];
var count = 0;

$(document).ready(function(){
    
    $.ajax({
        url: "/allcameras.json",
        dataType: "jsonp"
    });

});

function changeImage(selector, imageSrc) {		
    count += 1;
    var srcChange = imageSrc + "?variable=" + count;
    $(selector).attr("src", srcChange);        
}

function jsonCallback(json){

    allCameras = json;

    window.setInterval(function(){
        changeImage('#cam1', allCameras[0]);
        changeImage('#cam2', allCameras[1]);
        changeImage('#cam3', allCameras[2]);
    }, 1000);

}




/*

function readTextFile(file) {

    var xmlhttp = new XMLHttpRequest();
    
    xmlhttp.open("GET", file, true);

    xmlhttp.onreadystatechange = function ()
    {
        if(xmlhttp.readyState === 4)
        {
            if(xmlhttp.status === 200 || xmlhttp.status == 0)
            {
                var allText = xmlhttp.responseText;
                allCameras.push(allText);
                console.log(allCameras);
            }
        }
    }

    xmlhttp.send(null);

}

*/