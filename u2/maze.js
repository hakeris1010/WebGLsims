
class MazeLoader {
    /*! Constructs a Three.Scene from a SVGDocument and specified 3D properties.
     *  - doc - a SVGDocument object containing a SVG data source.
     *  - mazeProps - object containing specific options for constructing a scene.
     */ 
    constructor( baseDoc, mazeProps ) {
        // Maze's default properties.
        this.props = { wallHeight: 10, wallWidth: 5 };

        // ThreeJS scene containing the maze.
        this.scene = new THREE.Scene();

        // Bind the props to local var for easy access.
        var props = this.props;
        console.log("Maze parsing started: \n doc: "+baseDoc+"\n props: "+mazeProps+"\n");

        var doc = baseDoc.documentElement;
        var title = doc.getElementsByTagName("title")[0];

        this.props.width = parseInt(doc.getAttribute("width"));
        this.props.height = parseInt(doc.getAttribute("height"));

        console.log("Title: "+title.innerHTML+"\nWidth: "+this.props.width+"\nHeight: "+this.props.height);

        var mainG = doc.getElementsByTagName("g")[0];
        console.log("main G: "+mainG+", childs: "+mainG.childElementCount);
        console.log("Starting the loop!\n");

        // Add basic elements to scene
        this.addBasicSceneElements();

        // Now iterate through all the elements of the <g> section, and convert each of them to 3D.
        var nodes = mainG.children;
        for(var i=0; i<nodes.length; i++){
            console.log("["+i+"]: "+nodes[i]);
            // Convert the nodes to 3D objects, which will be added to our Scene.
            switch( nodes[i].nodeName ){
                case "line":
                    var poss = { 
                        x1: nodes[i].getAttribute("x1"),
                        x2: nodes[i].getAttribute("x2"),
                        y1: nodes[i].getAttribute("y1"),
                        y2: nodes[i].getAttribute("y2")
                    };

                    var wall = this.createWallBoxFromLine( poss );

                    //var rotWorldMatrix = new THREE.Matrix4();
                    //rotWorldMatrix.makeRotationAxis( new THREE.Vector3(0,1,0), -1 * rotation );
                    //rotWorldMatrix.multiply( cube.matrix );                // pre-multiply

                    //cube.matrix = rotWorldMatrix;
                    //cube.rotation.setFromRotationMatrix( cube.matrix );
                    //cube.rotation.setFromRotationMatrix( rotWorldMatrix );

                    // add the wall to the scene
                    this.scene.add( wall );

                    break;
            }
        }

        this.ready = true;
    }

    addBasicSceneElements(){
        // Create the ground plane
        var planeGeometry = new THREE.PlaneGeometry( 
            this.props.width, this.props.height, 
            this.props.width / 4, this.props.height / 4 
        );
        var planeMaterial = new THREE.MeshLambertMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
        });
        var plane = new THREE.Mesh(planeGeometry,planeMaterial);

        // Rotate and position the plane
        plane.position.x=0 + this.props.width/2;
        plane.position.y=0;
        plane.position.z=0 + this.props.height/2;
        plane.rotation.x = Math.PI/2;

        plane.receiveShadow = true;

        // Add the plane to the scene
        this.scene.add(plane);

        // Add ambient and hemispheric light sources.
        this.scene.add( new THREE.AmbientLight( 0x404040 ) );
        //this.scene.add( new THREE.HemisphereLight(0xdddddd) );

        // Add the Point Light.
        var pointLight = new THREE.PointLight(0xffffff, 0.7);
        pointLight.position.x = this.props.width/2;
        pointLight.position.y = ((this.props.width + this.props.height)/2) / 2;
        pointLight.position.z = this.props.height/2;

        console.log("Main Light Pos: "+Helper.vecToString( pointLight.position ) );

        this.scene.add( pointLight ); 
    }

    createWallBoxFromLine( lineCoords ){
        var poss = lineCoords;
        var props = this.props;

        var xDiff = poss.x2 - poss.x1;
        var yDiff = poss.y2 - poss.y1;
        var lenght = Math.sqrt( Math.pow(xDiff,2) + Math.pow(yDiff,2) );

        var rotation = Math.atan( yDiff / xDiff );

        //console.log("Woot! Line found! (len: "+lenght+", rot: "+rotation+")");

        // create a cube
        var cubeGeometry = new THREE.CubeGeometry( lenght, props.wallHeight, props.wallWidth );
        var cubeMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true});
        var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

        // position the cube. Because Three.JS coordinates are centered, we must
        // DeCenter our Poss coordinates to make stuff work.
        cube.position.x = poss.x1 //+ lenght / 2;
        cube.position.y = 0 + props.wallHeight/2;
        cube.position.z = poss.y1;

        // Rotate the cube around the Y (up) axis counter-clockwise.
        cube.rotation.y = -1 * rotation;

        return cube;
    }

    /*! Binds the renderer to canvas, and sets all rendering properties.
     *  - Gets the renderer fully ready to render.
     *  @param canvas - a HTML canvas which renderer will render to.
     */
    bindToCanvas(canvas) {
        // Check if scene is already ready.
        if(!this.ready) return;
        var scene = this.scene;
        var props = this.props;

        // Create a Renderer and Bind it to Canvas passed.
        this.renderer = new THREE.WebGLRenderer( { "canvas": canvas } );
        this.renderer.setClearColor( new THREE.Color(0xEEEEEE) );

        // Create a camera, which defines where we're looking at.
        this.camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
        this.camera.position.x = scene.position.x + props.width*1.5;
        this.camera.position.z = scene.position.z + props.height*1.5;
        this.camera.position.y = scene.position.y + ((props.width + props.height)/2) *1.5;

        this.camera.lookAt( new THREE.Vector3( 
            scene.position.x + props.width/2,
            scene.position.y,
            scene.position.z + props.height/2
        ) );

        console.log( "ScenePos: "+Helper.vecToString(scene.position)+
                     "\nCameraPos: "+Helper.vecToString(this.camera.position) );

        // Add basic stuff to the scene
        var axes = new THREE.AxesHelper( 100 );
        this.scene.add(axes);

        // Add a rendering function to queue of functions-to-call.
        //setTimeout( this.render, 0);
        this.render();
    }

    
    render() {
        if(!this.renderer){ 
            console.log("Renderer is UnDefined!");
            return;
        }
        this.renderer.render(this.scene, this.camera);
    }
}

class Helper{
    static vecToString( vec ){
        return "x: "+vec.x+", y: "+vec.y+", z: "+vec.z;
    };
}


function loadMaze(svgData, infoDivId, canvasId){
    try{
        // Load preview
        var image = new Image(200, 200);
        image.src = "data:image/svg+xml;base64,"+window.btoa(svgData);
        $(infoDivId).append( image );
        
        // Load Maze.
        var parser = new DOMParser();
        var svgDoc = parser.parseFromString( svgData, "image/svg+xml" );

        var loader = new MazeLoader( svgDoc, {wallHeight:0} );
        loader.bindToCanvas( $(canvasId)[0] );

    } catch(e) {
        alert(e);
    }
}


function loadMazeFromFile(file, infoDivId){
    // Print the file details
    $(infoDivId).html( "<p>Name: "+file.name+"<br>Size: "+file.size+"</p>" );
    console.log("Loading File"+file);

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
            callback( new File( [res], url, {name: url, lastModified: Date.now()} ) );
        })    
        .catch(error => {
            console.log("Request failed: ", error);
        })
}

//var DefaultMazePath = 'http://klevas.mif.vu.lt/~rimask/geometrija/maze_1.svg';
var DefaultMazePath = 'maze_1.svg';

$( document ).ready(() => {
    console.log( "ready!" );
    urlToFileData( DefaultMazePath, file => { loadMazeFromFile( file, '#mazeinfo' ); } );
    
    //testThreeJS( $('#myCanvas')[0] );
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

	var axes = new THREE.AxesHelper( 20 );
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


