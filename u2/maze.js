
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
    //
    testThreeJS( $('#myCanvas')[0] );
});


/* Three Jay Ess stuff. */

function testThreeJS( canvas ){
    console.log("canvas: "+canvas+"\n wid: "+canvas.width+"\n hei: "+canvas.height );

	// create a scene, that will hold all our elements such as objects, cameras and lights.
	var scene = new THREE.Scene();

	// create a camera, which defines where we're looking at.
	var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

	// create a render and set the size
	var renderer = new THREE.WebGLRenderer( { "canvas": canvas } );

	renderer.setClearColor( new THREE.Color(0xEEEEEE) );
	//renderer.setSize(500, 500);

	var axes = new THREE.AxisHelper( 20 );
	scene.add(axes);

	// create the ground plane
	var planeGeometry = new THREE.PlaneGeometry(60,20);
	var planeMaterial = new THREE.MeshBasicMaterial({color: 0xcccccc});
	var plane = new THREE.Mesh(planeGeometry,planeMaterial);


	// rotate and position the plane
	plane.rotation.x=-0.5*Math.PI;
	plane.position.x=15
	plane.position.y=0
	plane.position.z=0

	// add the plane to the scene
	scene.add(plane);

	// create a cube
	var cubeGeometry = new THREE.CubeGeometry(4,4,4);
	var cubeMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true});
	var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);


	// position the cube
	cube.position.x=-4;
	cube.position.y=3;
	cube.position.z=0;

	// add the cube to the scene
	scene.add(cube);

	var sphereGeometry = new THREE.SphereGeometry(4,20,20);
	var sphereMaterial = new THREE.MeshBasicMaterial({color: 0x7777ff, wireframe: true});
	var sphere = new THREE.Mesh(sphereGeometry,sphereMaterial);

	// position the sphere
	sphere.position.x=20;
	sphere.position.y=4;
	sphere.position.z=2;


	// add the sphere to the scene
	scene.add(sphere);

	// position and point the camera to the center of the scene
	camera.position.x = -30;
	camera.position.y = 40;
	camera.position.z = 30;
	camera.lookAt(scene.position);

	// add the output of the renderer to the html element
	//$("#WebGL-output").append(renderer.domElement);

	// render the scene
	renderer.render(scene, camera);
}


