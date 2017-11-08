
class MazeLoader {

    constructor(svgData, mazeProps) {
        
    }

    drawToCanvas(canvas) {

    }

}

function loadMaze(file, infoDiv){
    try{
        document.getElementById('mazeinfo').innerHTML = "<p>Name: "+file.name+"<br>Size: "+file.size;

        // Load preview
        var fr = new FileReader();
        fr.onload = evt => {
            var image = new Image(200, 200);
            image.src = 'data:image/svg+xml;utf8,'+ evt.target.result ;
            $('#mazePreview').append( image );
            
            //$('#mazePreview').html("<img  width=\"200\" height=\"200\""+
            //                       "src= \"data:image/svg;base64,"+window.btoa(evt.target.result)+"\"/>");
        }
        fr.readAsText(file);

        //var loader = new MazeLoader( evt.target.result, {wallType: "box", wallHeight: 100} );

    } catch(e) {
        alert(e);
    }
}
 
/*! Gets the raw file from the url specified. Calls a callback with the file received.
 * @param url - an URL path to a file
 * @param callback( file ) - a callback with a single File type parameter.
 */ 
function urlToFileData(url, callback) {
    fetch( url )
	    .then(res => res.blob())
	    .then(res => {
            callback( new File( [res], url, {lastModified: Date.now()} ) );
        })    
        .catch(error => {
            console.log("Request failed: ", error);
        })
}

//var DefaultMazePath = 'http://klevas.mif.vu.lt/~rimask/geometrija/maze_1.svg';
var DefaultMazePath = 'maze_1.svg';

$( document ).ready(() => {
    console.log( "ready!" );
    urlToFileData( DefaultMazePath, file => { loadMaze( file, null ); } );
});



