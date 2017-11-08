
class MazeLoader {

    constructor(svgDocument, mazeProps) {
        
    }

    drawToCanvas(canvas) {

    }

}

function loadMaze(svgData, infoDivId, canvasId){
    try{
        // Load preview
        var image = new Image(200, 200);
        image.src = 'data:image/svg+xml;utf8,'+ svgData ;
        $(infoDivId).append( image );
        
        // Load Maze.
        var loader = new MazeLoader( svgData, {wallHeight:0} );
        loader.drawToCanvas( $(canvasId)[0] );

    } catch(e) {
        alert(e);
    }
}


function loadMazeFromFile(file, infoDivId){
    // Print the file details
    $(infoDivId).html( "<p>Name: "+file.name+"<br>Size: "+file.size+"</p>" );

    try{
        var fr = new FileReader();
        fr.onload = evt => { loadMaze( evt.target.result, infoDivId, "#myCanvas") };
        fr.readAsText(file);

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

var DefaultMazePath = 'http://klevas.mif.vu.lt/~rimask/geometrija/maze_1.svg';
//var DefaultMazePath = 'maze_1.svg';

$( document ).ready(() => {
    console.log( "ready!" );
    //urlToFileData( DefaultMazePath, file => { loadMaze( file, null ); } );
});



