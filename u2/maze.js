
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
            wallColor: "random", groundColor: 0x808080, useShadows: false
        };
        this.baseSvgDocument = baseDoc;

        // TODO: Implement all these properties.
        var propertiesToCheck = [
            "wallHeight", "wallWidth", "wallLengthExtend", 
            "wallColor", "groundColor", "useShadows", "lightIntensity", "lightHeight",
            "enableCameraControls", "mazeRotationSpeed", "centerFigure", 
            "shortestPathTracker", "trackerSpeed", "trackerLight"
        ];

        // Add maze properties from the props's passed.
        propertiesToCheck.forEach( item => {
            if(typeof mazeProps[item] !== "undefined") 
                this.props[item] = mazeProps[item];
        } );

        DEBUG && console.log("Maze parsing started:\n doc: "+baseDoc+"\n props: "+mazeProps+"\n");

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

        DEBUG && console.log("Title: "+(title ? title.innerHTML : 'undefined')+"\nMazeWidth: "+
                    this.props.width+"\nMazeHeight: "+this.props.height);

        this.svgMainG = doc.getElementsByTagName("g")[0];
        DEBUG && console.log("main G: "+this.svgMainG+", childs: "+this.svgMainG.childElementCount);

        this.createScene();
        this.setupRendering();
    }

    /** 
     * Creates a scene containing all maze elements.
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

    /** 
     * Adds basic elements to scene: ground plane, and lights.
     */
    addBasicSceneElements(){
        var DEBUG = true;

        // Create the ground plane
        var planeGeometry = new THREE.PlaneGeometry( 
            this.props.width, this.props.height, 
            this.props.width / 4, this.props.height / 4 
        );
        var planeMaterial = new THREE.MeshLambertMaterial({
            color: this.props.groundColor,
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

        DEBUG && console.log("Main Light Pos: "+Helper.vecToString( pointLight.position ) );

        this.scene.add( pointLight ); 

        // Add axis helper
        var axesHelper = new THREE.AxesHelper( 200 );
        this.scene.add( axesHelper );
    }


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
        var cubeGeometry = new THREE.BoxGeometry( 
            poss.length + props.wallWidth, props.wallHeight, props.wallWidth,
            (poss.length + props.wallWidth)/4, props.wallHeight/4, props.wallWidth/4
        );
        var cubeMaterial = new THREE.MeshLambertMaterial({
            color: (props.wallColor==="random" ? Math.random()*0xffffff : props.wallColor),
            side: THREE.DoubleSide
        });

        var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.castShadow = true;
        cube.receiveShadow = true;

        // Position the cube. Because Three.JS coordinates are centered, we must
        // set position to line's center.
        cube.position.x = poss.center.x;
        cube.position.y = poss.center.y;
        cube.position.z = poss.center.z;

        // Rotate the cube around the Y (up) axis counter-clockwise.
        cube.rotation.y = poss.rotation;

        /*DEBUG && console.log("Line length: "+poss.length+
                    "\n Rotation vec: "+Helper.vecToString(cube.rotation)+
                    "\n Position vec: "+Helper.vecToString(cube.position) );
        */
        return cube;
    }

    /** 
     * Binds the renderer to canvas, and sets all rendering properties.
     *  - Gets the renderer fully ready to render.
     *  @param divId - a HTML div to which the canvas will be appended which renderer will render to.
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
}
 
/** 
 * Various helpers.
 * - Includes useful mathematical functions for working with coordinates.
 */ 
class Helper{
    /** Converts a vector {x, y, z} to string.
     */ 
    static vecToString( vec ){
        return "x: "+vec.x+", y: "+vec.y+", z: "+vec.z;
    };

    /**
     *  Get intersection point / overlap section of 2 line segments.
     *  - Uses the determinant intersection formula for finding an intersection point
     *  - If line segments are collinear, automatically calls getOverlap,
     *    to get an overlap region.
     *
     *  @param seg1 - First line segment (an object with properties {x1,y1, x2,y2})
     *  @param seg2 - Second line segment.
     *  @param onlySegments {boolean} - If set, return intersection only if 
     *      intersection is within the passed line segments, not beyond them.
     *
     *  @return {object} - an object with these properties:
     *   @property overlap {boolean} - set if segments overlap
     *     if not overlap:
     *   @property x, y {int}- intersection point coordinates
     *   @property seg1, seg2 - intersection point is within seg1 or seg2 respectively
     *     If overlap, returns values from getLineOverlap function.
     */ 
    static getLineIntersection( seg1, seg2, onlySegments ) {
        var x1=seg1.x1, x2=seg1.x2, y1=seg1.y1, y2=seg1.y2;
        var x3=seg2.x1, x4=seg2.x2, y3=seg2.y1, y4=seg2.y2;

        // Find denominator for the determinant line equation.
		var denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);

        // Lines are parallel. But if collinear, we must make more calculations.
		if (denom == 0) {
            // Find overlap of the lines. If value is returned, they overlap.
            var olap = Helper.getLineOverlap( x1,y1, x2,y2, x3,y3, x4,y4 );
            if( olap ){
                olap.overlap = true;
                return olap;
            }
            // Just parallel.
            return null; 
		}

        // Lines are intersecting. Find the coefficients, dividing by denominator.
		var ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3)) / denom;
		var ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3)) / denom;

        // Check if intersection is within seg1 and seg2
        var onSeg1 = ua >= 0 && ua <= 1; 
        var onSeg2 = ub >= 0 && ub <= 1;

        if(onlySegments && (!onSeg1 || !onSeg2))
            return null;

		return {
			x: x1 + ua*(x2 - x1),
			y: y1 + ua*(y2 - y1),
			"seg1": onSeg1,
            "seg2": onSeg2,
            overlap: false
        };
	}

    /**
     * Gets the overlap section of 2 collinear line segments.
     * - Uses the triangle area to find out if segments collinear,
     * - If yes, uses simple comparisons to find the overlapping section.
     * @param x1,y1, x2,y2, x3,y3, x4,y4 - coordinates of segment 1 and segment 2 
     *                                     start and end points, respectively.
     * @return {object} - an object with these properties:
     *  @property startX, startY - overlap start coords
     *  @property endX, endY   - overlap end coords
     *  @property inside {int} - which segment is inside another (if 0, no inside segments).
     *  @property wholeLine - if no segments are inside each other, the coords of the 
     *                        line encompassing both segments.  
     */ 
    static getLineOverlap( x1,y1, x2,y2, x3,y3, x4,y4 ){
        // Check if collinear.
        if( Helper.getTriangleArea( x1,y1, x2,y2, x3,y3 ) == 0 ){
            // Lines are collinear. Now ensure that x1 < x2 < x3 < x4, for easier computing.
            var compareY = (x1==x2); // If Xs are equal, compare Ys.
            var compareX = !compareY;

            if(compareY ? y1 > y2 : x1 > x2){
                var tx = x1, ty = y1;
                x1 = x2; y1 = y2;
                x2 = tx; y2 = ty;
            }
            if(compareY ? y3 > y4 : x3 > x4){
                var tx = x3, ty = y3;
                x3 = x4; y3 = y4;
                x4 = tx; y4 = ty;
            } 

            // Check if the lines don't have shared sections
            if(compareX ? (x2 < x3 || x4 < x1) : (y2 < y3 || y4 < y1)){
                return null;
            }
            // Now it means they have overlaps.

            // Check if second segment is inside the first
            if(compareX ? (x1 <= x3 && x4 <= x2) : (y1 <= y3 && y4 <= y2)){
                return { 
                    startX: x3, startY: y3,
                    endX: x4, endY: y4,
                    inside: 2 // Second is inside
                };
            }

            // Check if first segment is inside the second
            if(compareX ? (x3 < x1 && x2 < x4) : (y3 < y1 && y2 < y4)){
                return { 
                    startX: x1, startY: y1,
                    endX: x2, endY: y2,
                    inside: 1 // First is inside
                };
            }

            // Now, the elements are not inside each other.
            // Check if the first segment is upper than the second
            if(compareX ? (x1 < x3) : (y1 < y3)){
                return { 
                    startX: x3, startY: y3,
                    endX: x2, endY: y2,
                    inside: 0,
                    wholeLine:{
                        "x1": x1, "y1": y1,
                        "x2": x4, "y2": y4
                    }
                };
            }

            // Last case: if(compareX ? (x3 < x1) : (y3 < y1)){
            return { 
                startX: x1, startY: y1,
                endX: x4, endY: y4,
                inside: 0,
                wholeLine:{
                    "x1": x3, "y1": y3,
                    "x2": x2, "y2": y2
                }
            };
        }
        // Not collinear.
        return null;
    }

    /**
     * Uses the "Shoelace Formula" to find an area of triangle from 3 points.
     * @param x1,y1, x2,y2, x3,y3 - coordinates of point 1,2, and 3 respectively.
     * @return {int} an area of the triangle.
     */ 
    static getTriangleArea( x1,y1, x2,y2, x3,y3 ){
        return ( x1*y2 + x2*y3 + x3*y1 - x1*y3 - x2*y1 - x3*y2 ) / 2
    }

    /**
     *  Gets the distance from point to a line.
     *  - Uses the triangle formed from 3 points to find it's height - the distance.
     *  @param point - the point which distance from the line is being calculated.
     *  @param line - the line.
     *  @return {int} a distance from point to line.
     */ 
    static getPointDistanceFromLine( point, line ){
        var x1=line.x1, y1=line.y1;
        var x2=line.x2, y2=line.y2;
        var x =point.x, y =point.y;

        // Use the "Shoelace Formula" to find an area of triangle.
        //var area = 0.5 * Math.abs( (x1 - x2)*(y - y1) - (x1 - x)*(y2 - y1) );
        var area = Helper.getTriangleArea( x1,y1, x2,y2, x,y );

        // Now get the length of the base line.
        var AB = Math.sqrt( (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1) );
    
        // Calculate the height from the area formula.
        return (2 * area) / AB; 
    }

}


//============ UI part =============//

var DEBUG = true;
var currentLoader = null;

function loadMazeDocument(svgDoc, renderDivId){
    currentLoader = new MazeLoader( 
        svgDoc, 
        {
            wallHeight: 15,
            wallWidth: 6,       
            wallLengthExtend: 0, // -3
            useShadows: false
        },
        {
            "div":    renderDivId, 
            "width":  parseInt( $(renderDivId).attr("width") ),
            "height": parseInt( $(renderDivId).attr("height") )
        }
    );
    currentLoader.render();
    currentLoader.animate();
}

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

        loadMazeDocument(svgDoc, renderDivId);
        
    } catch(e) {
        DEBUG && console.log(e);
    }
}


function loadMazeFromFile(file, infoDivId){
    // Print the file details
    $(infoDivId).html( "<p>Name: "+file.name+"<br>Size: "+file.size+"</p>" );
    DEBUG && console.log("Loading File"+file);

    try{
        var fr = new FileReader();
        fr.onload = evt => { loadMaze( evt.target.result, infoDivId, "#renderdiv") };
        fr.readAsText(file);

    } catch(e) {
        DEBUG && console.log(e);
    }
}
 
/** 
 * Gets the raw file from the url specified. Calls a callback with the file received.
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
            DEBUG && console.log("Request failed: ", error);
        })
}

//var DefaultMazePath = 'http://klevas.mif.vu.lt/~rimask/geometrija/maze_1.svg';
var DefaultMazePath = 'maze_1.svg';
//var DefaultMazePath = 'testMaze.svg';

$( document ).ready(() => {
    DEBUG && console.log( "Ready!" );
    urlToFileData( DefaultMazePath, file => { loadMazeFromFile( file, '#mazeinfo' ); } );
    //loadMazeDocument( getTestDocument(), '#renderdiv' );
});

/** 
 * Get a test SVG document with specifically alligned lines, for testing.
 */
function getTestDocument(){
    var doc = null;
}


