
var allCameras = [];
var count = 0;

$(document).ready(function(){
    
    $.ajax({
        method: 'GET',
        url: 'http://requestb.in/wbocqbwb',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Connection', 'keep-alive');
            xhr.setRequestHeader('Keep-Alive', 'timeout=9999, max=1000');
        }
    });

});

function changeImage(selector, imageSrc) {		
    count += 1;
    var srcChange = imageSrc + "?variable=" + count;
    $(selector).attr("src", srcChange);        
}

function jsonCallback(json){

    allCameras = json;

    window.setInterval(function() {
        changeImage('#cam1', allCameras[0]);
        changeImage('#cam2', allCameras[1]);
        changeImage('#cam3', allCameras[2]);
    }, 1000);
}
