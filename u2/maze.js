
class MazeLoader {

    constructor(svgData, mazeProps) {
        
    }

    drawToCanvas(canvas) {

    }

}

function loadMaze(files, infoDiv){
    try{
        var file = files[0];
        document.getElementById('mazeinfo').innerHTML = "<p>Name: "+file.name+"<br>Size: "+file.size;

        // Load preview
        var fr = new FileReader();
        fr.onload = function(evt){
            $('#mazePreview').html("<img  width=\"200\" height=\"200\""+ 
                                   "src= \"data:image/svg;base64,"+scope.btoa(evt.target.result)+"\"/>");
        }
        fr.readAsText(file);

        //var loader = new MazeLoader( evt.target.result, {wallType: "box", wallHeight: 100} );

    } catch(e) {
        alert(e);
    }
}



