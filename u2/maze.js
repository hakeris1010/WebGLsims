
class MazeLoader {
    /*! Constructs a Three.Scene from a SVGDocument and specified 3D properties.
     *  - doc - a SVGDocument object containing a SVG data source.
     *  - mazeProps - object containing specific options for constructing a scene.
     */ 
    constructor( baseDoc, mazeProps, renderProps ) {
        // Maze's default properties.
        this.props = { wallHeight: 15, wallWidth: 5 };
        this.baseSvgDocument = baseDoc;

        console.log("Maze parsing started: \n doc: "+baseDoc+"\n props: "+mazeProps+"\n");

        var doc = baseDoc.documentElement;
        var title = doc.getElementsByTagName("title")[0];

        // Set maze sizes
        this.props.width = parseInt(doc.getAttribute("width"));
        this.props.height = parseInt(doc.getAttribute("height"));

        // Set rendering properties - viewport, and div to render to.
        this.rendProps = {
            "divId" : renderProps.div,
            "width" : (renderProps.width  ? renderProps.width  : window.innerWidth ),
            "height": (renderProps.height ? renderProps.height : window.innerHeight)
        };

        console.log("Title: "+(title ? title.innerHTML : 'undefined')+"\nMazeWidth: "+
                    this.props.width+"\nMazeHeight: "+this.props.height);

        this.svgMainG = doc.getElementsByTagName("g")[0];
        console.log("main G: "+this.svgMainG+", childs: "+this.svgMainG.childElementCount);

        this.createScene();
        this.setupRendering();
    }

    /*! Creates a scene containing all maze elements.
     */ 
    createScene(){
        // ThreeJS scene containing the maze.
        this.scene = new THREE.Scene();

        // Add basic elements to scene (Lights, etc).
        this.addBasicSceneElements();

        // Iterate through all the elements of the <g> section, and convert 
        // each of them to properly positioned maze lines. 
        // Then for each of them create a 3D Wall Box. 
        this.properizeMazeElements( this.svgMainG.children, elem => {
            switch(elem.type){
            case "line":
                this.scene.add( this.createWallBoxFromLine( elem.data ) );
            }
        } );

        this.ready = true;
    }

    /*! Adds basic elements to scene: ground plane, and lights.
     */
    addBasicSceneElements(){
        // Create the ground plane
        var planeGeometry = new THREE.PlaneGeometry( 
            this.props.width, this.props.height, 
            this.props.width / 4, this.props.height / 4 
        );
        var planeMaterial = new THREE.MeshLambertMaterial({
            color: 0x808080,
            side: THREE.DoubleSide
        });
        var plane = new THREE.Mesh(planeGeometry,planeMaterial);

        // Rotate and position the plane
        plane.position.x = 0 + this.props.width/2;
        plane.position.y = -0.35;
        plane.position.z = 0 + this.props.height/2;
        plane.rotation.x = Math.PI/2;

        plane.receiveShadow = true;

        // Add the plane to the scene
        this.scene.add(plane);

        // Add ambient and hemispheric light sources.
        this.scene.add( new THREE.AmbientLight( 0x404040 ) );
        //this.scene.add( new THREE.HemisphereLight(0xdddddd) );

        // Add the Point Light, and mark it as a shadow caster
        var pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.castShadow = true;

        pointLight.position.x = this.props.width/2;
        pointLight.position.y = ((this.props.width + this.props.height)/2);
        pointLight.position.z = this.props.height/2;

        console.log("Main Light Pos: "+Helper.vecToString( pointLight.position ) );

        this.scene.add( pointLight ); 

        // Add axis helper
        var axesHelper = new THREE.AxesHelper( 200 );
        this.scene.add( axesHelper );
    }


    /*! Makes the properly positioned maze lines from SVG nodes passed.
     *  - Fixes the corner collisions, to make corners of maze walls look nice.
     *  @param svgNodeArray - an array-like Node collection, containing SVG nodes.
     *  @param elemCallback - an optional callback to call after each 
     *                        successfully converted element.
     */
    properizeMazeElements( svgNodeArray, elemCallback ){
        var nodes = svgNodeArray;
        var points = [];

        for(var i=0; i<nodes.length; i++){
            var skipNode = false; // Set if line needs to be skipp'd (already exists).

            switch( nodes[i].nodeName ){
            case "line":
                // Get line point coordinates from attributes
                var poss = { 
                    x1: parseInt( nodes[i].getAttribute("x1") ),
                    x2: parseInt( nodes[i].getAttribute("x2") ),
                    y1: parseInt( nodes[i].getAttribute("y1") ),
                    y2: parseInt( nodes[i].getAttribute("y2") ),
                    
                    collision1: false,
                    collision2: false
                };
                poss.rotation = Math.atan( Math.abs( (poss.y2 - poss.y1) / (poss.x2 - poss.x1) ) );
                
                // Check if there exists some points which could make collisions.
                for(var j = 0; j < points.size; j++) {
                    var pt = points[j];

                    var diffPtX1 = Math.abs(pt.x - poss.x1);
                    var diffPtY1 = Math.abs(pt.y - poss.y1);

                    var diffPtX2 = Math.abs(pt.x - poss.x2);
                    var diffPtY2 = Math.abs(pt.y - poss.y2);

                    var coll_1 = (diffPtX1 < wallWidth && diffPtY1 < wallWidth);
                    var coll_2 = (diffPtX2 < wallWidth && diffPtY2 < wallWidth);

                    // Resolve collisions by moving point's coordinates such
                    // that the walls won't collide.
                    if(coll_1 && coll_2){
                        skipNode = true;
                        poss.collision1 = true;
                        poss.collision2 = true;
                        break;
                    }
                    else if( coll_1 ){
                        poss.x1 += Math.cos( poss.rotation ) * (wallWidth - diffPtX1);
                        poss.y1 += Math.sin( poss.rotation ) * (wallWidth - diffPtY1);
                        poss.collision1 = true;
                        break;
                    }
                    else if( coll_2 ){
                        poss.x2 += Math.cos( poss.rotation ) * (wallWidth - diffPtX2);
                        poss.y2 += Math.sin( poss.rotation ) * (wallWidth - diffPtY2);
                        poss.collision2 = true;
                        break;
                    }
                }

                if(poss.collision1)
                    points.push({x: poss.x1, y: poss.y1});

                if(poss.collision2)
                    points.push({x: poss.x2, y: poss.y2});

                // Continue to next iteration if node needs to be skipp'd.
                if(skipNode)
                    continue;
                    
                // Get the graphical 3D coordinates for rendering.
                // TODO: Use graphical coords for rendiering.

                // When finished modifying, call a callback.
                if(elemCallback) {
                    elemCallback( {
                        type: "line", 
                        data: poss
                    } );
                }

                break;
            }
        }
    }

    /*! Gets the rendering coordinate-oriented properties: rotation, axis differences.
     *  @param lineCoords - SVG type line coords {x1,y1, x2,y2}
     */ 
    getLineProps( lineCoords ){
        var poss = lineCoords;
        return {
            xDiff: poss.x2 - poss.x1,
            yDiff: poss.y2 - poss.y1,
            
            xCenter: poss.x1 + xDiff/2,
            yCenter: poss.y1 + yDiff/2,

            lenght: Math.sqrt( Math.pow(xDiff,2) + Math.pow(yDiff,2) ),
            rotation: -1 * Math.atan( yDiff / xDiff )
        }
    }

    /*! Function create a ThreeJS Box with specific coordinates.
     *  @param lineCoords - a structure representing line coordinates - {x1,y1,x2,y2}.
     *  @return ThreeJS Mesh object, representing a box just created.
     */ 
    createWallBoxFromLine( lineCoords ){
        var poss = lineCoords;
        var props = this.props;

        var xDiff = poss.x2 - poss.x1;
        var yDiff = poss.y2 - poss.y1;
        var lenght = Math.sqrt( Math.pow(xDiff,2) + Math.pow(yDiff,2) );

        var rotation = Math.atan( yDiff / xDiff );

        // Create a Wall (Using the ThreeJS's Cube).
        var cubeGeometry = new THREE.BoxGeometry( 
            lenght + props.wallWidth, props.wallHeight, props.wallWidth,
            (lenght + props.wallWidth)/4, props.wallHeight/4, props.wallWidth/4,
        );
        var cubeMaterial = new THREE.MeshLambertMaterial({
            color: 0x81680085, 
            side: THREE.DoubleSide
        });
        var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.castShadow = true;
        cube.receiveShadow = true;

        // Position the cube. Because Three.JS coordinates are centered, we must
        // set position to line's center.
        cube.position.x = poss.x1 + xDiff/2;
        cube.position.z = poss.y1 + yDiff/2;
        cube.position.y = 0 + props.wallHeight/2;

        // Rotate the cube around the Y (up) axis counter-clockwise.
        cube.rotation.y = -1*rotation;

        console.log(" Converting line to wall: (len: "+lenght+", rot: "+rotation+")."+
                    "\n Position vec: "+Helper.vecToString(cube.position) );

        return cube;
    }

    /*! Binds the renderer to canvas, and sets all rendering properties.
     *  - Gets the renderer fully ready to render.
     *  @param divId - a HTML div to which the canvas will be appended which renderer will render to.
     */
    setupRendering(){
        // Check if scene is already ready.
        if(!this.ready) return;
        var scene = this.scene;
        var props = this.props;

        var divId = this.rendProps.divId;
        var width = this.rendProps.width;
        var height = this.rendProps.height;

        // Create a camera, which defines where we're looking at.
        
        this.camera = new THREE.PerspectiveCamera(
            45, 
            width / height, 
            0.1, 
            7000
        );
        this.camera.position.x = scene.position.x + props.width*1.1;
        this.camera.position.z = scene.position.z + props.height*1.1;
        this.camera.position.y = scene.position.y + ((props.width + props.height)/2) *1.5;

        var cameraTarget = new THREE.Vector3( 
            scene.position.x + props.width/2,
            scene.position.y,
            scene.position.z + props.height/2
        ); 

        // Set camera controls.
        var controls = new THREE.TrackballControls( this.camera );
        controls.target.set( cameraTarget.x, cameraTarget.y, cameraTarget.z);

        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;

        controls.noZoom = false;
        controls.noPan = false;

        //controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;

        controls.keys = [ 65, 83, 68 ];

        controls.addEventListener( 'change', this.render.bind(this) );
        
        this.controls = controls;

        // Set camera to look at the center of the maze.
        this.camera.lookAt( cameraTarget );
        
        // Setup stats for FPS view.
        this.stats = new Stats();
        //this.container.append( this.stats.dom );

        console.log( "ScenePos: "+Helper.vecToString(scene.position)+
                     "\nCameraPos: "+Helper.vecToString(this.camera.position) );

        // Create a Renderer and add drawing canvas to Div passed.

        this.renderer = new THREE.WebGLRenderer( { 
            antialias: true 
        } );
        this.renderer.setClearColor( new THREE.Color(0x1A1A1A) );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( width, height );

        // Setup the shadow system.
        this.renderer.shadowMapEnabled = true;
        this.renderer.shadowMapType = THREE.PCFSoftShadowMap; // Anti-aliasing.

        // Add render canvas to the container
        this.container = $(divId);
        this.container.append( this.renderer.domElement );

        // If size is bound to window's size, change it on each resize.
        if(width === window.innerWidth && height === window.innerHeight)
            window.addEventListener( 'resize', this.onWindowResize, false );
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.controls.handleResize();

        this.render();
    }
    
    /*! Renders the scene.
     */ 
    render() {
        //if(this.stop) return;

        this.renderer.render(this.scene, this.camera);
        this.stats.update();
    }

    /*! Animate function performing an animations loop.
     *  Called from outside the renderer to start the loop.
     */ 
    animate(){
        //if(this.stop) return;

        //stats.begin();
        // monitored code goes here
        //stats.end();

        // Use a binder to bind this function to this object.
        this.controls.update();
        this.animationID = requestAnimationFrame( this.animate.bind(this) );
    }

    /*! Stop rendering and destroy the loader.
     */ 
    destroy(){
        this.stop = true;
        if(this.animationID)
            cancelAnimationFrame( this.animationID );
    }
}

class Helper{
    static vecToString( vec ){
        return "x: "+vec.x+", y: "+vec.y+", z: "+vec.z;
    };
}


//============ UI part =============//

var currentLoader = null;

function loadMaze(svgData, infoDivId, renderDivId){
    try{
        if( currentLoader ){
            currentLoader.destroy();
            $(renderDivId).empty();
        }

        // Load preview
        var image = new Image(200, 200);
        image.src = "data:image/svg+xml;base64,"+window.btoa(svgData);
        $(infoDivId).append( image );
        
        // Load Maze.
        var parser = new DOMParser();
        var svgDoc = parser.parseFromString( svgData, "image/svg+xml" );

        currentLoader = new MazeLoader( 
            svgDoc, 
            {
                wallHeight:15
            },
            {
                "div":    renderDivId, 
                "width":  parseInt( $(renderDivId).attr("width") ),
                "height": parseInt( $(renderDivId).attr("height") )
            }
        );
        currentLoader.render();
        currentLoader.animate();

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
        fr.onload = evt => { loadMaze( evt.target.result, infoDivId, "#renderdiv") };
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


