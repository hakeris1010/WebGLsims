
/**
 *  SVG Maze Loading class.
 *  - Uses ThreeJS library to load a SVG-defined maze as a 3D object, and render it 
 *    to a canvas.
 *  - TODO: Many additional features can be enabled - animations, game mode, 
 *          shortest path tracking, etc...
 *  - TODO: Document all tweakable properties.
 */
class MazeLoader {
    /** 
     * Constructs a Three.Scene from a SVGDocument and specified 3D properties.
     * @constructor
     *  @param doc - a SVGDocument object containing a SVG data source.
     *  @param mazeProps - object containing specific options for constructing a scene.
     *  @param renderProps - object containing the rendering data (canvas, viewport size).
     */ 
    constructor( baseDoc, mazeProps, renderProps ) {
        var DEBUG = true;

        // Maze's default properties.
        this.props = { 
            wallHeight: 15, wallWidth: 5, wallLengthExtend: 0, 
            wallColor: "random", groundColor: 0x808080, useShadows: false,
            mazeRotationSpeed: 0.001,
            mazeTextureRepeat: 1.0
        };
        this.baseSvgDocument = baseDoc;

        // TODO: Implement all these properties.
        var propertiesToCheck = [
            "wallHeight", "wallWidth", "wallLengthExtend", 
            "wallColor", "groundColor", "mazeTextureURLs", "mazeTextureRepeat",
            "useShadows", "lightIntensity", "lightPosition", "lightOnCamera",
            "enableCameraControls", "mazeRotationSpeed", "bouncingBall",
            "centerFigure", "shortestPathTracker", "trackerSpeed", "trackerLight"
        ];

        // Add maze properties from the props's passed.
        propertiesToCheck.forEach( item => {
            if(typeof mazeProps[item] !== "undefined") 
                this.props[item] = mazeProps[item];
        } );

        // Output maze properties.
        console.log("Props: \n"); 
        for( var prop in this.props ){
            if( this.props.hasOwnProperty( prop ) )
                console.log(" "+prop+": " + this.props[ prop ]);
        }

        // Set rendering properties - viewport, and div to render to.
        this.rendProps = {
            "divId" : renderProps.div,
            "width" : (renderProps.width  ? renderProps.width  : window.innerWidth ),
            "height": (renderProps.height ? renderProps.height : window.innerHeight)
        }; 
        
        // Check if we've got a place to render to.
        if( !this.rendProps.divId ){
            throw "[MazeLoader]: No rendering Div specified!";
        } 

        DEBUG && console.log("Maze parsing started:\n doc: "+baseDoc+"\n props: "+mazeProps+"\n");

        var doc = baseDoc.documentElement;
        var title = doc.getElementsByTagName("title")[0];

        // Set maze sizes
        this.props.width = parseInt(doc.getAttribute("width"));
        this.props.height = parseInt(doc.getAttribute("height"));

        DEBUG && console.log("Title: "+(title ? title.innerHTML : 'undefined')+"\nMazeWidth: "+
                    this.props.width+"\nMazeHeight: "+this.props.height);

        this.svgMainG = doc.getElementsByTagName("g")[0];
        DEBUG && console.log("main G: "+this.svgMainG+", childs: "+
                this.svgMainG.childElementCount);

        this.createScene();
        this.setupRendering();
    }
     
    /**
     * Loads a texture from URL.
     * @param texURL - URL of the image file to load.
     * @return a ThreeJS texture object.
     */ 
    loadTexture( texURL, callback ){
        if( !this.textureLoader ){
            this.textureLoader = new THREE.TextureLoader();
            // To allow download from other servers, set CORS to anonymous. 
            this.textureLoader.setCrossOrigin( "anonymous" ); 
        }

        console.log("[Maze:LoadTexture()]: Loading \""+texURL+"\"");
        var ret = this.textureLoader.load( texURL, 
            tex => { 
                console.log("[Maze:LoadTexture()]: Texture Loaded! ("+tex+")"); 
                if( callback )
                    callback( tex );
            }, 
            null, 
            a => { 
                console.log("[Maze:LoadTexture()]: Error occured! ("+a.type+")"); 
            } 
        );
        return ret;
    }

    /** Loads all needed textures.
     *  - Stored in object this.textures.
     */ 
    setupTextures(){
        this.textures = {};

        // Set maze textures - different texture for each of maze wall's sides:
        //  - Roof (same as ground)
        //  - All other sides.
        if(this.props.mazeTextureURLs && this.props.mazeTextureURLs.length > 0){
            this.textures.maze = [];

            // Load every texture.
            this.props.mazeTextureURLs.forEach( item => {
                var text = this.loadTexture( item, (tex) => { } );
                text.wrapS = text.wrapT = THREE.RepeatWrapping;
                //text.offset.set( 0, 0 );
                //text.repeat.set( 2, 2 );

                this.textures.maze.push( text );
            } );

            // Ground texture is the first one - the same as the wall's roof texture.
            this.textures.ground = this.textures.maze[ 0 ];
        }
    }

    /** Creates all needed ThreeJS materials.
     *  - Stored in object this.materials.
     */ 
    setupMaterials(){
        this.materials = {};

        // ================================== //
        // If no texture, material will be the same Mesh Lambert Colored Material.
        this.materials.mazeWall_NoTexture = new THREE.MeshLambertMaterial( {
            side: THREE.DoubleSide,
            color: this.props.wallColor === "random" ?  
                   Math.random()*0xffffff : this.props.wallColor 
        } );
        
        // If texture is present, create 5 different materials for each face. 
        if( this.textures.maze ){
            this.materials.mazeWall_Textured = [];

            this.textures.maze.forEach( item => {
                this.materials.mazeWall_Textured.push( new THREE.MeshLambertMaterial( {
                    side: THREE.DoubleSide,
                    map: item
                }) );
            } );

            console.log("Created "+this.materials.mazeWall_Textured.length+
                        " textured materials.");

            // Fill remaining materials with the first one.
            for(var i = this.materials.mazeWall_Textured.length; i < 6; i++){
                this.materials.mazeWall_Textured.push(  
                    this.materials.mazeWall_Textured[ 0 ].clone()
                );
            }
            console.log("After fill: "+this.materials.mazeWall_Textured.length);
        }

        console.log("Setting mazeWall material.");

        // ================================== //
        // Set the ground plane material. 
        //
        var groundPlane = new THREE.MeshLambertMaterial({
            side: THREE.DoubleSide
        });

        if( this.textures.maze )
            groundPlane.map = this.textures.ground;
        else
            groundPlane.color = new THREE.Color( this.props.groundColor );

        console.log("Setting groundPlane material ("+groundPlane.constructor.name+")");
        this.materials.groundPlane = groundPlane;
    }

    /** 
     * Creates a scene containing all maze elements.
     */ 
    createScene(){
        // At first, set the start point for the maze walls.
        // This is done because the scene must be centered at (0,0,0) of the world space.
        this.props.mazeStart = {
            x: -1*this.props.width/2,
            y: 0,
            z: -1*this.props.height/2
        };

        // Load all needed textures.
        this.setupTextures();

        // Set All materials that will be used.
        this.setupMaterials();

        // Create a ThreeJS scene containing the maze.
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
        });

        this.ready = true;
    }

    /** 
     * Adds basic elements to scene: ground plane, and lights.
     */
    addBasicSceneElements(){
        var DEBUG = true;
        var props = this.props;

        // Create the ground plane
        var planeGeometry = new THREE.PlaneGeometry( 
            this.props.width, this.props.height, 
            this.props.width / 4, this.props.height / 4 
        );
        var planeMaterial = this.materials.groundPlane;

        var plane = new THREE.Mesh(planeGeometry,planeMaterial);

        // Set shadowing.
        plane.receiveShadow = true;

        // Rotate and position the plane
        plane.position.x = this.props.mazeStart.x + this.props.width/2;
        plane.position.y = this.props.mazeStart.y - 0.35;
        plane.position.z = this.props.mazeStart.z + this.props.height/2;

        plane.rotation.x = Math.PI/2;

        // Map UV coordinates of the plane, if texture has been assigned.
        if( plane.material.map ){
            this.setUVCoords( plane );
        }

        // Add the plane to the scene
        this.scene.add(plane);

        // Add ambient light sources.
        this.scene.add( new THREE.AmbientLight( 0x404040 ) );

        // Add the Point Light, and mark it as a shadow caster
        var pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.castShadow = true;

        pointLight.position.x = props.mazeStart.x + props.width/2;
        pointLight.position.y = props.mazeStart.y + ((this.props.width + this.props.height)/2);
        pointLight.position.z = props.mazeStart.z + this.props.height/2;

        DEBUG && console.log("Main Light Pos: "+Helper.vecToString( pointLight.position ) );

        this.pointLight = pointLight;
        this.scene.add( pointLight ); 

        // Add axis helper
        var axesHelper = new THREE.AxesHelper( 200 );
        this.scene.add( axesHelper );
    }

    /** 
     * Get the rendering-ready ThreeJS type coords from the svg-style positions.
     *  @param lineCoords - SVG type line coords {x1,y1, x2,y2}
     *  @return the object with ThreeJS coordinates and props.
     */ 
    getLineThreeJsCoords( poss ){
        var retv = {};
        retv.xDiff = poss.x2 - poss.x1;
        retv.yDiff = poss.y2 - poss.y1;

        retv.rotation = ( 
            (typeof poss.rotation !== "undefined") ?
            -1 * poss.rotation :
            -1 * Math.atan( Math.abs( retv.yDiff / retv.xDiff ) )
        );
                    
        retv.length = (
            (typeof poss.length !== "undefined") ? poss.length :
            Math.sqrt( Math.pow(retv.xDiff,2) + Math.pow(retv.yDiff,2) )
        );

        retv.center = new THREE.Vector3(
            poss.x1 + retv.xDiff/2,
            this.props.wallHeight/2,
            poss.y1 + retv.yDiff/2
        );

        return retv;
    }

    /** 
     * Function create a ThreeJS Box with specific coordinates.
     *  @param lineCoords - a structure representing line coordinates - {x1,y1,x2,y2}.
     *  @return ThreeJS Mesh object, representing a box just created.
     */ 
    createWallBoxFromLine( lineCoords ){
        var DEBUG = true;

        var poss = this.getLineThreeJsCoords( lineCoords );
        var props = this.props;

        // DEBUG purposes.
        poss.length += props.wallLengthExtend;
        
        // Create a Wall (Using the ThreeJS's Cube).
        var geometry = new THREE.BoxGeometry( 
            poss.length + props.wallWidth, props.wallHeight, props.wallWidth
            /*, (poss.length + props.wallWidth)/4, props.wallHeight/4, props.wallWidth/4*/
        );
        
        // Create a cube material, with a texture assigned if one is set.
        var cube;

        // Check if we have textured materials.
        if( typeof this.materials.mazeWall_Textured !== 'undefined' && 
            this.materials.mazeWall_Textured.length > 0 )
        {
            console.log("Setting textured materials.");

            // Use the MultiMaterial feature of ThreeJs, to assign materials
            // to faces from an array.
            cube = new THREE.Mesh( geometry, this.materials.mazeWall_Textured );
        }
        // If no textures, just use colored materials.
        else{
            console.log("Setting Non-Textured (Simple) materials.");

            let material = this.materials.mazeWall_NoTexture;

            // Setup random color.
            if( this.props.wallColor === "random" ){
                material = material.clone(); 
                material.color = new THREE.Color( Math.random() * 0xffffff ); 
            }

            cube = new THREE.Mesh( geometry, material );
        }

        // Setup shadowing.
        cube.castShadow = true;
        cube.receiveShadow = true;

        // Set cube's "Model Matrix" (rotation, scaling, and position):

        // Position the cube. Because Three.JS coordinates are centered, we must
        // set position to line's center.
        cube.position.x = this.props.mazeStart.x + poss.center.x;
        cube.position.y = this.props.mazeStart.y + poss.center.y;
        cube.position.z = this.props.mazeStart.z + poss.center.z;

        // Rotate the cube around the Y (up) axis counter-clockwise.
        cube.rotation.y = poss.rotation;
        
        // When cube's Model matrix has been set, map UV coordinates, 
        // if texture has been assigned. This uses cube's World Matrix to map UV.
        if( cube.material.map ){
            this.setUVCoords( cube, {fixBoxMaterials: true} );
        }

        return cube;
    }

    /**
     * Sets UV coordinates, if texture usage is set.
     * - Maps UVs to every vertex so that whole maze has the contiguous texture.
     *
     * To map UVs, we need to get every vertex's coords in World space. 
     *
     * - To do this, we apply this synchronize the mesh's Model Matrix (which translates 
     *   Model Coordinates to World Coordinates) with the positioning properties, and
     *   aplly it to the geometry (automatically to every vertex), to get 
     *   the coordinates of the vertex after the rotation, scaling, and 
     *   moving have been done (the World Coordinates).
     *
     * - WARNING: This function synchronizes the positioning with the matrix,
     *            and as a result, ALL POSITIONING PROPERTIES ARE BEING RESET.
     *
     *            To get the positioning after, you'd need to extract it from
     *            the .matrixWorld attribute.
     *
     * @param mesh - fully constructed mesh.
     * @param props - specific propercies:
     *  - fixBoxMaterials:
     *      - If set, will assign proper materials to each face.
     *
     *  - uvSetter:
     *      - a specific callback which takes (x, y, z) of the vertex, 
     *        and returns U and V coordinates.
     *
     *      - If not set, defaults to Maze's continuous texture generator.
     */ 
    setUVCoords( mesh, props = {} ){
        // Update (or create) the world matrix of this object, applying the 
        // position, rotation and scaling which were set before.
        //
        // Apply this matrix to the geometry too, because updateMatrix 
        // only updates the Mesh's matrix, but nothing is done on geometry.
        //
        // This will translate face vertices directly to world space,
        // allowing us to easily compute the UVs.
        //
        // The following operations 6 mesh operations don't change the mesh's 
        // matrix, they just synchronize the changes made in properties or the matrix.
        //
        mesh.updateMatrix();
        mesh.geometry.applyMatrix( mesh.matrix );

        // However, we must reset the pos, rot, and scaling of the object,
        // to prevent double transformation from occuring when rendering.
        // We won't need them anymore, because data is already in the matrix.
        mesh.position.set( 0, 0, 0 );
        mesh.rotation.set( 0, 0, 0 );
        mesh.scale.set( 1, 1, 1 );

        // After this, we can update matrix again, to clear the 
        // "position modified" flag. This is not necessary though.
        mesh.updateMatrix();    

        // Set easy-access variables.
        var props = this.props;
        var geometry = mesh.geometry;

        // Set Texture repeat coefficient.
        var repeat = (props.mazeTextureRepeat ? props.mazeTextureRepeat : 1.0 );

        // Map UV coordinates of the wall.
        geometry.faceVertexUvs[0] = [];

        // UV Mapper Function. We map by using X and Z coordinates.
        var getUVs = ( props.uvSetter ? props.uvSetter : ( (x, y, z, face) => {
            return {
                u: ((x - props.mazeStart.x) / props.width) * repeat , 
                v: ((z - props.mazeStart.z) / props.height) * repeat
            };
            //if( !props.fixBoxMaterials || face == 2 )
            /*if( face == 1 || face == 3 )
                return {
                    u: ((x - props.mazeStart.x) / props.width) * repeat , 
                    v: ((y - props.mazeStart.y) / props.wallHeight) * repeat
                };*/
            // face == 0 || face == 5
            /*return {
                u: (Math.abs(x - props.mazeStart.x) / props.width) * repeat , 
                v: (Math.abs(y - props.mazeStart.y) / props.wallHeight) * repeat
            } */
        }) );

        for( var i = 0; i < geometry.faces.length; i++ ){
            var face = geometry.faces[ i ];
            //console.log("Face: "+i);

            // Get vertices of this face. a, b, and c are indexes 
            // of the vertices of this face, in a 'vertices' buffer,
            //
            // Now we actually don't need to apply the matrix because we already did
            // in the setup of the mesh before.

            var v1 = geometry.vertices[face.a]; //.applyMatrix4( mesh.matrixWorld );
            var v2 = geometry.vertices[face.b]; //.applyMatrix4( mesh.matrixWorld );
            var v3 = geometry.vertices[face.c]; //.applyMatrix4( mesh.matrixWorld );

            // Map UVs by using x and z axes on a mazespace.
            var uv1 = getUVs( v1.x, v1.y, v1.z, i );
            var uv2 = getUVs( v2.x, v2.y, v2.z, i );
            var uv3 = getUVs( v3.x, v3.y, v3.z, i );

            geometry.faceVertexUvs[0].push([
                new THREE.Vector2( uv1.u, uv1.v ),
                new THREE.Vector2( uv2.u, uv2.v ),
                new THREE.Vector2( uv3.u, uv3.v )
            ]);
        }

        geometry.uvsNeedUpdate = true;
    }

    /** 
     * Binds the renderer to canvas, and sets all rendering properties.
     *  - Gets the renderer fully ready to render.
     * @param divId - a HTML div to which the canvas will be appended 
     *                which renderer will render to.
     */
    setupRendering(){
        var DEBUG = true;

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
            ((props.width + props.height)/2) * 5
        );
        this.camera.position.x = scene.position.x + props.width * 0.9;
        this.camera.position.z = scene.position.z + props.height * 0.9;
        this.camera.position.y = scene.position.y + ((props.width + props.height)/2) * 1.5;

        var cameraTarget = new THREE.Vector3( 
            props.mazeStart.x + props.width/2,
            props.mazeStart.y,
            props.mazeStart.z + props.height/2
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

        DEBUG && console.log( "ScenePos: "+Helper.vecToString(scene.position)+
                     "\nCameraPos: "+Helper.vecToString(this.camera.position) );

        // Create a Renderer and add drawing canvas to Div passed.

        this.renderer = new THREE.WebGLRenderer( { 
            antialias: true 
        } );
        this.renderer.setClearColor( new THREE.Color(0x1A1A1A) );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( width, height );

        // Setup the shadow system.
        if(this.props.useShadows){
            this.renderer.shadowMapEnabled = true;
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

        // monitored code goes here
        //this.stats.begin();

        if( this.props.mazeRotationSpeed ){
            this.scene.rotation.y += this.props.mazeRotationSpeed;

            this.render();
        }

        this.controls.update();
        //this.stats.end();

        // Use a binder to bind this function to 'this' object.
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



    //========================================================//

    //========================================================//

    //========================================================//

    //========================================================//

    /** 
     * Makes the properly positioned maze lines from SVG nodes passed.
     *  - Fixes the corner collisions, to make corners of maze walls look nice.
     *  @param svgNodeArray - an array-like Node collection, containing SVG nodes.
     *  @param elemCallback - an optional callback to call after each 
     *                        successfully converted element.
     */
    properizeMazeElements( svgNodeArray, elemCallback ){
        var DEBUG = true;

        var nodes = svgNodeArray;
        var lines = [];

        for(var i=0; i<nodes.length; i++){
            var node = nodes[i];

            switch( node.nodeName ){
            case "line":
                // Get line point coordinates from attributes
                var poss = { 
                    x1: parseInt( node.getAttribute("x1") ),
                    x2: parseInt( node.getAttribute("x2") ),
                    y1: parseInt( node.getAttribute("y1") ),
                    y2: parseInt( node.getAttribute("y2") ),
                };
                var properizedLines = this.fixCollisionsForLine( poss, lines, 0 );

                // If no collisions were found, put current line to fixed lines array..
                if(properizedLines){
                    properizedLines.forEach( elem => {
                        lines.push( elem );
                    } );
                }
                break;
            }
        }

        // Call a callback for each converted line.
        DEBUG && console.log("\nCount of Final Lines: "+lines.length+"\n");
        lines.forEach( elem => {
            if(elemCallback) {
                elemCallback( {
                    type: "line", 
                    data: elem
                } );
            }
        } );
    }

    /** 
     * Fixes the collisions between lines by splitting the current line.
     * @param currentLine - the line being modified to fix collisions.
     * @param otherLines - an array of lines to which the currentLine will be 
     *      compared to find collisions.
     *      NOTE: this array may be modified to fix some already existing collisions.
     * @param startOn - start iterating over otherLines on this index. Default 0.
     * @param recLevel - recursion level. Reserved only for this function itself.
     *
     * @return an array of lines got by splitting the current line to fix collisions.
     *
     * FIXME: Lines collide when wallWidth is higher than wallLength.
     */ 
    fixCollisionsForLine( currentLine, otherLines, startOn=0, recLevel=0 ){
        var DEBUG = false;

        var lines = otherLines;
        var retlines = [];
        var segments = [];
         
        var poss = currentLine;
        poss.rotation = Math.atan( Math.abs( (poss.y2 - poss.y1) / (poss.x2 - poss.x1) ) );

        var recMargin = "*".repeat(recLevel+1);
        DEBUG && console.log("\n"+recMargin+"Properizing a Line. Lines.len:"+
                    lines.length+", startOn: "+startOn);

        // Check if there exists some points which could make collisions, and fix'em.
        var i;
        for(i = startOn; i < lines.length; i++) {
            var wallWidth = this.props.wallWidth;

            // Check for intersection between lines.
            var interpt = Helper.getLineIntersection( lines[i], poss, true );

            // Fix intersection by splitting line into two, if possible.
            if( interpt ){
                var seg1len = 0, seg2len = 0;

                // Check if lines are not overlapping, but have an intersection point.
                if(!interpt.overlap){
                    seg1len = Math.sqrt( (poss.x1 - interpt.x)*(poss.x1 - interpt.x) +
                                         (poss.y1 - interpt.y)*(poss.y1 - interpt.y) );

                    seg2len = Math.sqrt( (poss.x2 - interpt.x)*(poss.x2 - interpt.x) +
                                         (poss.y2 - interpt.y)*(poss.y2 - interpt.y) );

                    DEBUG && console.log(recMargin+
                        "Found collision: intersection: ("+interpt.x+","+interpt.y+
                        "), seg1_len: "+seg1len+", seg2_len: "+seg2len);

                    // If length exceeds half of wall's width, the segment is visible.
                    if(seg1len > wallWidth/2){
                        segments.push( {
                            x1: poss.x1,
                            y1: poss.y1,
                            x2: interpt.x - Math.cos( poss.rotation ) * wallWidth,
                            y2: interpt.y - Math.sin( poss.rotation ) * wallWidth,
                            rotation: poss.rotation,
                        } ); 
                    }

                    if(seg2len > wallWidth/2){
                        segments.push( {
                            x1: interpt.x + Math.cos( poss.rotation ) * wallWidth,
                            y1: interpt.y + Math.sin( poss.rotation ) * wallWidth,
                            x2: poss.x2,
                            y2: poss.y2,
                            rotation: poss.rotation,
                        } );
                    }
                }
                // Lines are collinear, and Overlap exists.
                else{
                    DEBUG && console.log(recMargin+"Found overlap: start: ("+
                        interpt.startX+","+interpt.startY+"), end: ("+interpt.endX+
                        ","+interpt.endY+"), inside: "+interpt.inside);

                    // If one segment is inside the other, one of them must be removed.
                    if(interpt.inside == 1){ // First inside (lines[i] is inside poss).
                        // Remove lines[i], and continue the collision search.
                        lines.splice(i, 1);
                    }
                    else if(interpt.inside == 1){ // Second inside (poss is inside lines[i]).
                        // Just return empty array, because this line can be skipped.
                        return retlines;
                    }
                    else{ // No elements are inside each other, but we have an overlap.
                        // Just remove lines[i], and start properizing new line,
                        // which encompasses both lines[i] and poss.
                        lines.splice(i, 1);

                        var seg = interpt.wholeLine;
                        seg.rotation = poss.rotation;
                        segments.push(seg);
                    }
                }
                
                break;
            }
        }

        // Now for each segment recursively call this fixer function.
        segments.forEach( elem => {
            var recursiveRet = this.fixCollisionsForLine( elem, lines, i, recLevel+1 );
            if(recursiveRet){
                DEBUG && console.log(recMargin+"Got from recursion: "+recursiveRet.length);
                recursiveRet.forEach( el => { retlines.push(el); } );
            }
        } );

        // If no collisions were found - no segmentations were made. 
        if(!retlines.length) 
            retlines.push(poss); // Just push the unmodified line which was passed.

        DEBUG && console.log(recMargin+ "End. lines.length: "+lines.length+
            ", retlines.lenght: "+retlines.length+", retlines:");
        retlines.forEach( el => {
            DEBUG && console.log(recMargin+" p1=("+el.x1+","+el.y1+
                "), p2=("+el.x2+","+el.y2+"), rot="+el.rotation);
        } );

        return retlines;
    }


}


/**
 * Tools for fixing collisions in SVG lines to make them look better in 3D space.
 * - Contains methods for processing a line array, and fixes collisions according to
 *   properties specified (line width, etc).
 */ 
class SVGLineProperizer{
    /** 
     * Makes the properly positioned maze lines from SVG nodes passed.
     *  - Fixes the corner collisions, to make corners of maze walls look nice.
     *  @param svgNodeArray - an array-like Node collection, containing SVG nodes.
     *  @param elemCallback - an optional callback to call after each 
     *                        successfully converted element.
     *
     * @param props - comparison properties:
     *      - wallWidth - the width of the 2D/3D line (called a wall).
     */
    static properizeSVGElements( svgNodeArray, elemCallback, props ){
        var DEBUG = true;

        var nodes = svgNodeArray;
        var lines = [];

        for(var i=0; i<nodes.length; i++){
            var node = nodes[i];

            switch( node.nodeName ){
            case "line":
                // Get line point coordinates from attributes
                var poss = { 
                    x1: parseInt( node.getAttribute("x1") ),
                    x2: parseInt( node.getAttribute("x2") ),
                    y1: parseInt( node.getAttribute("y1") ),
                    y2: parseInt( node.getAttribute("y2") ),
                };
                var properizedLines = 
                    SVGLineProperizer.fixCollisionsForLine( poss, lines, props, 0 );

                // If no collisions were found, put current line to fixed lines array..
                if(properizedLines){
                    properizedLines.forEach( elem => {
                        lines.push( elem );
                    } );
                }
                break;
            }
        }

        // Call a callback for each converted line.
        DEBUG && console.log("\nCount of Final Lines: "+lines.length+"\n");
        lines.forEach( elem => {
            if(elemCallback) {
                elemCallback( {
                    type: "line", 
                    data: elem
                } );
            }
        } );
    }

    /** 
     * Fixes the collisions between lines by splitting the current line.
     * @param currentLine - the line being modified to fix collisions.
     * @param otherLines - an array of lines to which the currentLine will be 
     *      compared to find collisions.
     *      NOTE: this array may be modified to fix some already existing collisions.
     *
     * @param props - comparison properties:
     *      - wallWidth - the width of the 2D/3D line (called a wall).
     *
     * @param startOn - start iterating over otherLines on this index. Default 0.
     * @param recLevel - recursion level. Reserved only for this function itself.
     *
     * @return an array of lines got by splitting the current line to fix collisions.
     *
     * FIXME: Lines collide when wallWidth is higher than wallLength.
     */ 
    static fixCollisionsForLine( currentLine, otherLines, props, startOn=0, recLevel=0 ){
        var DEBUG = true;

        var lines = otherLines;
        var retlines = [];
        var segments = [];
         
        var poss = currentLine;
        var wallWidth = props.wallWidth;
        poss.rotation = Math.atan( Math.abs( (poss.y2 - poss.y1) / (poss.x2 - poss.x1) ) );

        var recMargin = "*".repeat(recLevel+1);
        DEBUG && console.log("\n"+recMargin+"Properizing a Line. Lines.len:"+
                    lines.length+", startOn: "+startOn);

        // Check if there exists some points which could make collisions, and fix'em.
        var i;
        for(i = startOn; i < lines.length; i++) {
            // Check for intersection between lines.
            var interpt = Helper.getLineIntersection( lines[i], poss, true );

            // Fix intersection by splitting line into two, if possible.
            if( interpt ){
                var seg1len = 0, seg2len = 0;

                // Check if lines are not overlapping, but have an intersection point.
                if(!interpt.overlap){
                    seg1len = Math.sqrt( (poss.x1 - interpt.x)*(poss.x1 - interpt.x) +
                                         (poss.y1 - interpt.y)*(poss.y1 - interpt.y) );

                    seg2len = Math.sqrt( (poss.x2 - interpt.x)*(poss.x2 - interpt.x) +
                                         (poss.y2 - interpt.y)*(poss.y2 - interpt.y) );

                    DEBUG && console.log(recMargin+
                        "Found collision: intersection: ("+interpt.x+","+interpt.y+
                        "), seg1_len: "+seg1len+", seg2_len: "+seg2len);

                    // If length exceeds half of wall's width, the segment is visible.
                    if(seg1len > wallWidth/2){
                        segments.push( {
                            x1: poss.x1,
                            y1: poss.y1,
                            x2: interpt.x - Math.cos( poss.rotation ) * wallWidth,
                            y2: interpt.y - Math.sin( poss.rotation ) * wallWidth,
                            rotation: poss.rotation,
                        } ); 
                    }

                    if(seg2len > wallWidth/2){
                        segments.push( {
                            x1: interpt.x + Math.cos( poss.rotation ) * wallWidth,
                            y1: interpt.y + Math.sin( poss.rotation ) * wallWidth,
                            x2: poss.x2,
                            y2: poss.y2,
                            rotation: poss.rotation,
                        } );
                    }
                }
                // Lines are collinear, and Overlap exists.
                else{
                    DEBUG && console.log(recMargin+"Found overlap: start: ("+
                        interpt.startX+","+interpt.startY+"), end: ("+interpt.endX+
                        ","+interpt.endY+"), inside: "+interpt.inside);

                    // If one segment is inside the other, one of them must be removed.
                    if(interpt.inside == 1){ // First inside (lines[i] is inside poss).
                        // Remove lines[i], and continue the collision search.
                        lines.splice(i, 1);
                    }
                    else if(interpt.inside == 1){ // Second inside (poss is inside lines[i]).
                        // Just return empty array, because this line can be skipped.
                        return retlines;
                    }
                    else{ // No elements are inside each other, but we have an overlap.
                        // Just remove lines[i], and start properizing new line,
                        // which encompasses both lines[i] and poss.
                        lines.splice(i, 1);

                        var seg = interpt.wholeLine;
                        seg.rotation = poss.rotation;
                        segments.push(seg);
                    }
                }
                
                break;
            }
        }

        // Now for each segment recursively call this fixer function.
        segments.forEach( elem => {
            var recursiveRet = 
                SVGLineProperizer.fixCollisionsForLine( elem, lines, i, recLevel+1 );
            if(recursiveRet){
                DEBUG && console.log(recMargin+"Got from recursion: "+recursiveRet.length);
                recursiveRet.forEach( el => { retlines.push(el); } );
            }
        } );

        // If no collisions were found - no segmentations were made. 
        if(!retlines.length) 
            retlines.push(poss); // Just push the unmodified line which was passed.

        DEBUG && console.log(recMargin+ "End. lines.length: "+lines.length+
            ", retlines.lenght: "+retlines.length+", retlines:");
        retlines.forEach( el => {
            DEBUG && console.log(recMargin+" p1=("+el.x1+","+el.y1+
                "), p2=("+el.x2+","+el.y2+"), rot="+el.rotation);
        } );

        return retlines;
    }
}

