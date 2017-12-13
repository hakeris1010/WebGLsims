class TexturedConvex 
{
static getDefault( key ){
    switch(key){
    case "image" : return "https://www.wpclipart.com/recreation/games/chess/chessboard.png";
    case "vertexCount" : return 1000;
    case "shapeParams" : 
        var r = {
            type: "cone",
            radius: 10,
            height: 30,
            size: 30
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
    // Add properties
    this.params = { 
        image:       params ? params.image       : 0 || TexturedConvex.getDefault( "image" ),
        material:    params ? params.material    : 0 || TexturedConvex.getDefault( "material" ),
        vertexCount: params ? params.vertexCount : 0 || TexturedConvex.getDefault( "vertexCount" ),
        shapeParams: params ? params.shapeParams : 0 || TexturedConvex.getDefault( "shapeParams" )
    };
    var sp = this.params.shapeParams;

    // Generate convex points.
    var vertexes = [];
    var uvs = [];

    // Points are generated in range [ -size, size ].
    // (Reminder: Math.random() generates a number in range [0, 1]).
    for(var i = 0; i < this.params.vertexCount; i++){
        var x = (Math.random() - 0.5) * 2*sp.size;
        var y = (Math.random() - 0.5) * 2*sp.size;
        var z = (Math.random() - 0.5) * 2*sp.size;

        // Check if points comply to shape equation.
        if( sp.equation( x, y, z ) )
            vertexes.push( new THREE.Vector3( x, y, z ) );
    }

    // Create a ConvexGeometry.
    this.geometry = new THREE.ConvexGeometry( vertexes );

    // Apply a texture to geometry.
    this.applyTexture();
}

applyTexture(){

}

getMesh(){

}

}

