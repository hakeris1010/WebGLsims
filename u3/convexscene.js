class Helper{
    static vecToString( vec ){
        return "x: "+vec.x+", y: "+vec.y+", z: "+vec.z;
    }
};

class ConvexScene{

constructor( rendiv ){
    this.props = {
        div: rendiv,
        width:  parseInt( $(rendiv).attr( "width" ) )  || 300,
        height: parseInt( $(rendiv).attr( "height" ) ) || 300
    };

    console.log("Props: \n width: "+this.props.width+" height: "+this.props.height+"\n");

    this.scene = new THREE.Scene();

    this.setupRendering();
    this.addBasicSceneElements();
}

addBasicSceneElements(){
    var DEBUG = true;

    // Create the ground plane
    var planeGeometry = new THREE.PlaneGeometry( 
        this.props.width, this.props.height, 
        this.props.width / 4, this.props.height / 4 
    );
    var planeMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide
    });
    var plane = new THREE.Mesh(planeGeometry,planeMaterial);

    // Rotate and position the plane
    plane.position.x = 0;
    plane.position.y = -0.35;
    plane.position.z = 0;
    plane.rotation.x = Math.PI/2;

    plane.receiveShadow = true;

    // Add the plane to the scene
    this.scene.add(plane);
    

    // TODO::::
    var texConv = new TexturedConvex( {} ).getMesh();
    texConv.receiveShadow = true;
    
    this.scene.add( texConv );



    // Add ambient and hemispheric light sources.
    this.scene.add( new THREE.AmbientLight( 0x404040 ) );

    // Add the Point Light, and mark it as a shadow caster
    var pointLight = new THREE.PointLight(0xffffff, 0.4);
    pointLight.castShadow = true;

    pointLight.position.x = 0;
    pointLight.position.y = ((planeGeometry.parameters.width + 
                              planeGeometry.parameters.height)/2) / 3;
    pointLight.position.z = 0;

    DEBUG && console.log("Main Light Pos: "+Helper.vecToString( pointLight.position ) );

    this.scene.add( pointLight ); 

    // Add axis helper
    var axesHelper = new THREE.AxesHelper( 200 );
    this.scene.add( axesHelper );
}

setupRendering( canvas ){
    var DEBUG = true;

    var props = this.props;
    var scene = this.scene;

    var divId = this.props.div;
    var width = this.props.width;
    var height = this.props.height;

    // Create a camera, which defines where we're looking at.
    
    this.camera = new THREE.PerspectiveCamera(
        45, 
        width / height, 
        0.1, 
        (width + height / 2) * 4
    );
    this.camera.position.x = scene.position.x + props.width*1.1;
    this.camera.position.z = scene.position.z + props.height*1.1;
    this.camera.position.y = scene.position.y + ((props.width + props.height)/2) *1.5;

    var cameraTarget = new THREE.Vector3( 
        scene.position.x,
        scene.position.y,
        scene.position.z 
    ); 

    // Set camera controls.
    var controls = new THREE.TrackballControls( this.camera );
    controls.target.set( cameraTarget.x, cameraTarget.y, cameraTarget.z );

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

    DEBUG && console.log( "ScenePos: "+Helper.vecToString(scene.position)+
                 "\nCameraPos: "+Helper.vecToString(this.camera.position) );

    // Create a Renderer and add drawing canvas to Div passed.

    this.renderer = new THREE.WebGLRenderer( { 
        antialias: true 
    } );
    this.renderer.setClearColor( new THREE.Color(0x999999) );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( width, height );

    // Setup the shadow system.
    if(this.props.useShadows){
        this.renderer.shadowMapEnabled = false;
        this.renderer.shadowMapType = THREE.PCFSoftShadowMap; // Anti-aliasing.
    }

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

/** 
 * Renders the scene.
 */ 
render() {
    //if(this.stop) return;

    this.renderer.render(this.scene, this.camera);
    this.stats.update();
}

/** 
 * Animate function performing an animations loop.
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

/** 
 * Stop rendering and destroy the loader.
 */ 
destroy(){
    this.stop = true;
    if(this.animationID)
        cancelAnimationFrame( this.animationID );
}

};

/** Client part (website specific).
 *  Construct a new Convex Scene, and render it.
 */ 

var conScene = null;

function drawConvexScene( rendiv ){
    console.log("Constructing...");
    conScene = new ConvexScene( rendiv );

    console.log("Starting drawing!");
    conScene.render();
    conScene.animate();
}


