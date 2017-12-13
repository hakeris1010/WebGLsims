class TexturedConvex 
{
static getDefault( key ){
    switch(key){
    case "image" : return "https://www.wpclipart.com/recreation/games/chess/chessboard.png";
    case "vertexCount" : return 1000;
    case "material" : 
        return new THREE.MeshLambertMaterial( { 
            color: 0xffffff, 
            side: THREE.DoubleSide 
        } );
    case "shapeParams" : 
        var r = {
            type: "cone",
            radius: 50,
            height: 100,
            size: 200
        };
        // Cone equation.
        r.equation = ( x, y, z ) => {
            return ( x*x + z*z <= Math.pow(r.radius/r.height, 2) * Math.pow(y-r.height/2, 2) ) &&
                   ( y <= r.height/2 ) && ( y >= -1*r.height/2 ); 
        };
        return r;
    }
    return 0;
}

constructor( params ){
    var propertiesToCheck = [ "image", "material", "vertexCount", "shapeParams" ];
    this.props = {};
    /*this.params = { 
        image:       params ? params.image       : 0 || TexturedConvex.getDefault( "image" ),
        material:    params ? params.material    : 0 || TexturedConvex.getDefault( "material" ),
        vertexCount: params ? params.vertexCount : 0 || TexturedConvex.getDefault( "vertexCount" ),
        shapeParams: params ? params.shapeParams : 0 || TexturedConvex.getDefault( "shapeParams" )
    };*/

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

    // Points are generated in range [ -size, size ].
    // (Reminder: Math.random() generates a number in range [0, 1]).
    for(var i = 0; i < this.props.vertexCount; i++){
        var x = (Math.random() - 0.5) * 2*sp.size;
        var y = (Math.random() - 0.5) * 2*sp.size;
        var z = (Math.random() - 0.5) * 2*sp.size;

        // Check if points comply to shape equation.
        if( sp.equation( x, y, z ) )
            vertexes.push( new THREE.Vector3( x, y, z ) );
    }

    // Create a ConvexGeometry.
    this.geometry = new THREE.ConvexGeometry( vertexes );

    // Loop through the faces of the geometry, and compute UV coords for each face.
	//this.assignUVs();

    // Load a texture from image, and apply to the material.
    if(this.props.image)
        this.setTextureFromImage( this.props.image );
}

// Loop through the faces of the geometry, and compute UV coords for each face.
assignUVs() {
	var geometry = this.geometry;
    geometry.faceVertexUvs[0] = [];

    geometry.faces.forEach(function(face) {

        var components = ['x', 'y', 'z'].sort(function(a, b) {
            return Math.abs(face.normal[a]) > Math.abs(face.normal[b]);
        });

        var v1 = geometry.vertices[face.a];
        var v2 = geometry.vertices[face.b];
        var v3 = geometry.vertices[face.c];

        geometry.faceVertexUvs[0].push([
            new THREE.Vector2(v1[components[0]], v1[components[1]]),
            new THREE.Vector2(v2[components[0]], v2[components[1]]),
            new THREE.Vector2(v3[components[0]], v3[components[1]])
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

