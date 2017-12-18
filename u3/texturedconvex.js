/**
 * Convex shape generator.
 * - Uses equations to generate vertices which form the final convex shape.
 * - Uses dynamic UV mapping (by the same equations) to map UVs to the shape.
 *
 * Works by using THREE.ConvexGeometry to create a hull over randomly generated points.
 *
 * The program generates random points and check if they met the conditions,
 * specified in the shape-defining equation.
 *
 * (Reminder: Math.random() generates a number in range [0, 1)).
 * After subtracting 0.5, we get random values in range [-0.5, 0.5).
 *
 * In order to get the values in range close to the size of convex
 * (size is the bounding box measurements), we must multiply them by size * factor
 * Then we get coords between [-0.5*size*factor, 0.5*size*factor).
 *
 * We use a specific factor to get coordinates a bit further from edges.
 */ 

var DEBUG = true;

class TexturedConvex 
{
static getDefault( key ){
    switch(key){
    //highlightPoints: https://threejs.org/examples/webgl_geometry_convex.html
    case "highlightPoints" : return false;
    case "image" : return "https://www.wpclipart.com/recreation/games/chess/chessboard.png";
    case "vertexCount" : return 50000;
    case "material" : 
        return new THREE.MeshLambertMaterial( { 
            color: 0xffffff, 
            side: THREE.DoubleSide,
            wireframe: false
        } );
    case "shapeParams" : 
        // Default convex shape - cone.
        var r = {
            type: "cone",
            radius: 50,
            height: 100,
        };

        // Bounding box, for efficient point generation.
        r.boundingBox = {
            x: r.radius*2, 
            y: r.height,
            z: r.radius*2
        };

        // Cone equation.
        r.equation = ( x, y, z ) => {
            return ( x*x + z*z <= Math.pow(r.radius/r.height, 2) * Math.pow(y-r.height/2, 2) ) &&
                   ( y <= r.height/2 ) && ( y >= -1*r.height/2 ); 
        };

        /** Gets the UV coordinates from vertex 3D coordinates.
         *  We must project the 3D point to a 2D plane with dimensions [0,1]x[0x1].
         *  We know that cone has a fixed height, and x rotates around by a circle.
         *  So:
         *  - It's known that y = height  =>  v = (y + height/2) / height.
         *  - We compute U by using the angle of vector (x,z). 
         *    atan2(x,z) = alpha  =>  u = alpha/pi.
         */ 
        r.getUV = ( x, y, z ) => {
            return {
                v: (y + r.height/2) / r.height ,
                u: (Math.atan2( z, x ) + Math.PI/2) / Math.PI
            };
        };

        return r;
    }
    return 0;
}

constructor( params ){
    var propertiesToCheck = [ "image", "material", "vertexCount", "shapeParams" ];
    this.props = {};

    // Add Properties
    propertiesToCheck.forEach( item => {
        if( params ? typeof params[item] !== "undefined" : false ) 
            this.props[item] = params[item];
        else
            this.props[item] = TexturedConvex.getDefault( item );
    } ); 

    var sp = this.props.shapeParams;

    // Generate convex points.
    var vertexes = [];
    var factor = 1.05;

    DEBUG && console.log("Generating convex points ("+this.props.vertexCount+").");

    for(var i = 0; i < this.props.vertexCount; i++){
        var x = (Math.random() - 0.5) * sp.boundingBox.x * factor;
        var y = (Math.random() - 0.5) * sp.boundingBox.y * factor;
        var z = (Math.random() - 0.5) * sp.boundingBox.z * factor;

        // Check if points comply to shape equation.
        if( sp.equation( x, y, z ) )
            vertexes.push( new THREE.Vector3( x, y, z ) );
    }

    DEBUG && console.log( "Generation ended. Final point count: "+vertexes.length );

    // Create a ConvexGeometry.
    this.geometry = new THREE.ConvexGeometry( vertexes );

    // Loop through the faces of the geometry, and compute UV coords for each face.
	//this.assignUVs();

    // Load a texture from image, and apply to the material.
    //if(this.props.image)
    //    this.setTextureFromImage( this.props.image );
    
    DEBUG && console.log("Final Convex:\n Material: "+this.props.material);
}

// Loop through the faces of the geometry, and compute UV coords for each face.
assignUVs() {
    var sp = this.props.shapeParams;
	var geometry = this.geometry;

    geometry.faceVertexUvs[0] = [];

    geometry.faces.forEach( (face) => {
        // Get vertices of this face. a, b, and c are indexes 
        // of the vertices of this face, in a 'vertices' buffer.
        var v1 = geometry.vertices[face.a];
        var v2 = geometry.vertices[face.b];
        var v3 = geometry.vertices[face.c];

        // Get UV coords using the shape's provided function.
        var uv1 = sp.getUV( v1.x, v1.y, v1.z );
        var uv2 = sp.getUV( v2.x, v2.y, v2.z );
        var uv3 = sp.getUV( v3.x, v3.y, v3.z );

        geometry.faceVertexUvs[0].push([
            new THREE.Vector2( uv1.u, uv1.v ),
            new THREE.Vector2( uv2.u, uv2.v ),
            new THREE.Vector2( uv3.u, uv3.v )
        ]);

    });

    geometry.uvsNeedUpdate = true;
}

setTextureFromImage( image ){
    // Create a loader and load a texture.
    var texture = new THREE.TextureLoader().load( image );

	// Apply this texture to current material.
	this.props.material.map = texture; 
}

applyTexture(){
    
}

getMesh(){
    return new THREE.Mesh( this.geometry, this.props.material );
}

}

