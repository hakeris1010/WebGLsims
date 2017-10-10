window.requestAnimFrame = 
    window.requestAnimationFrame || window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame || window.oRequestAnimationFrame || 
        window.msRequestAnimationFrame ||
        function(callback) {
          window.setTimeout(callback, 1000 / 60);
        };

function draw(myLink, ctx) {
    ctx.beginPath();
    ctx.rect(-myLink.off, -myLink.off, myLink.width+2*myLink.off, 2*myLink.off);
    ctx.fillStyle = myLink.color;
    ctx.fill();
    ctx.lineWidth = myLink.borderWidth;
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.beginPath();        
    ctx.arc(0,0,myLink.borderWidth/2,0,Math.PI*2,true);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.beginPath();        
    ctx.arc(myLink.width,0,myLink.borderWidth/2,0,Math.PI*2,true);
    ctx.fillStyle = 'white';
    ctx.fill();
}

function drawTriangle(hei, wid, color){
    ctx.beginPath();
    ctx.fillStyle = color();
    ctx.moveTo(0,0);
    ctx.lineTo(wid,0);
    ctx.lineTo(wid/2, hei);
    ctx.fill();
}


function drawLine(x1, y1, x2, y2, ctx) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawLineArray(array, ctx) {
    for(var i = 0; i < array.length; i++){
          drawLine(array[i].x1, array[i].y1, array[i].x2, array[i].y2, ctx);
    }
}

function getAlphaByCosines(a, b, c) {
    return Math.acos( (Math.pow(b,2) + Math.pow(c,2) - Math.pow(a,2)) / (2*b*c) );
}

function getSideByCosines(alpha, b, c) {
    return Math.sqrt( Math.pow(b,2) + Math.pow(c,2) - 2*b*c*Math.cos(alpha) );
}

function animate(gLink, aLink, fLink, bLink, canvas, ctx, startTime) {
    // check for errors according to Grashof condition.
    // We are simulating only Crank-type input link (aLink). So remove all other possibilities.
    
    if(!( ( (gLink.width + fLink.width - aLink.width - bLink.width >= 0 && gLink.width - fLink.width - aLink.width + bLink.width >= 0) || 
            (gLink.width + fLink.width - aLink.width - bLink.width < 0 && gLink.width - fLink.width - aLink.width + bLink.width < 0) ) && 
          (-gLink.width + fLink.width - aLink.width + bLink.width >= 0) ))
    {
        throw "Bad ConFiguration: g: "+gLink.width+", a: "+aLink.width+", f: "+fLink.width+", b: "+bLink.width;
    }

    // update
    var time = (new Date()).getTime() - startTime;
    var t = time / (100/rotationSpeed)

    var startOffset = {x: canvas.width/2 - gLink.width/2, y: canvas.height/2};

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the Main Link
    ctx.save();
    ctx.translate(startOffset.x, startOffset.y);
    draw(gLink, ctx);

    ctx.restore();

    // Compute and draw the aLink

    /*aLink.x1 = aLink.x2;    
    aLink.y1 = aLink.y2;   
    aLink.x2 = canvas.width/2 - gLink.width/2 + (aLink.width * Math.cos(rotAngle));
    aLink.y2 = canvas.height/2 + (aLink.width * Math.sin(rotAngle));

    aLink.lineCoords.push({x1:aLink.x1, y1:aLink.y1, x2:aLink.x2, y2:aLink.y2 });
    if(aLink.lineCoords.length > 50)
        aLink.lineCoords.shift();

    drawLineArray(aLink.lineCoords, ctx);
    */

    // Compute the rotation angle
    var rotAngle = ( (Math.PI/180)*t ) % (Math.PI*2);

    // Draw the rotating link
    ctx.save();
    ctx.translate(startOffset.x, startOffset.y);
    ctx.rotate(rotAngle);
    draw(aLink, ctx);

    ctx.restore();

    // Draw other links according to the Law of Cosines
    // get the lenght of the center imaginary line, which divides the structure into 2 triangles.
    var centerSide = getSideByCosines(rotAngle, gLink.width, aLink.width);

    // get angles in the 1st triangle (mainLink, aLink, centerSide): 
    // before the main link (b) and before the aLink (c).
    var tri1 = { centerSide: rotAngle,
                 gLink: getAlphaByCosines(gLink.width, aLink.width, centerSide),
                 aLink: getAlphaByCosines(aLink.width, gLink.width, centerSide) };
    
    // Now get the angles of the 2nd triangle (centerLink, fLink, bLink):
    // before the centerLink (a), before the fLink (b), before the bLink (c).
    var tri2 = { centerSide: getAlphaByCosines(centerSide, fLink.width, bLink.width),
                 fLink: getAlphaByCosines(fLink.width, bLink.width, centerSide),
                 bLink: getAlphaByCosines(bLink.width, fLink.width, centerSide) }
    

    // Now let's start drawing stuff!
    // Get bLink rotation angle, and then coordinates of bLink (and fLink) endpoint. 
    var bLinkRotation = (rotAngle <= Math.PI) ? 
                        (Math.PI - tri1.aLink - tri2.fLink) : 
                        (Math.PI - (tri2.fLink - tri1.aLink));

    // get coords of flink end position (according to bLink rotation)
    var fLinkEndpoint = (bLinkRotation <= Math.PI) ?

                        ( { x: Math.cos( Math.PI - bLinkRotation ) * bLink.width,
                            y: Math.sin( Math.PI - bLinkRotation ) * bLink.width } ) :

                        ( { x: Math.cos( Math.PI*2 - bLinkRotation ) * bLink.width,
                            y: Math.sin( Math.PI*2 - bLinkRotation ) * bLink.width } ) ;

    // get the coordinates of the fLink start position
    var fLinkStart = { x: Math.cos(rotAngle) * aLink.width,
                       y: Math.sin(rotAngle) * aLink.width };

    // finally, get fLink rotation angle. (arctangent of Y / X) (coordinates of start and end used here)
    var fLinkRotation = Math.atan( (fLinkEndpoint.y - fLinkStart.y) / 
                                   ((gLink.width - fLinkEndpoint.x) - fLinkStart.x) );


    // Draw the bLink
    ctx.save();
    ctx.translate(startOffset.x + gLink.width, startOffset.y);
    ctx.rotate( bLinkRotation );
    draw(bLink, ctx);
    ctx.restore();

    // Draw the fLink (on which the triangle will do it's job too btw)
    ctx.save();
    ctx.translate(startOffset.x + fLinkStart.x, startOffset.y + fLinkStart.y);
    ctx.rotate( fLinkRotation );
    draw(fLink, ctx);
    ctx.restore();


    // request new frame
    requestAnimFrame(function() {
      animate(gLink, aLink, fLink, bLink, canvas, ctx, startTime);
    });
}

// Canvas
var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

// Speed properties
var rotationSpeed = 10;

// Link styles

var aLink = {
    color: '#8ED6FF',
    width: 300,
    off: 10,
    borderWidth: 4,

    x1: 0, y1: 0,
    x2: 0, y2: 0
};

var bLink = {
    color: '#FF8ED6',
    width: 130,
    off: 10,
    borderWidth: 4,
    x1: 0, y1: 0,
    x2: 0, y2: 0,
    lineCoords: [{x1: canvas.width/2 - aLink.width/2, y1: canvas.height/2, x2: canvas.width/2 - aLink.width/2, y2: canvas.height/2}]
};

var cLink = {
    color: '#00FF00',
    width: 280,
    off: 10,
    borderWidth: 4,
    x1: 0, y1: 0,
    x2: 0, y2: 0
};

var dLink = {
    color: '#1199BB',
    width: 180,
    off: 10,
    borderWidth: 4,
    x1: 0, y1: 0,
    x2: 0, y2: 0
};



var startTime = (new Date()).getTime();

// Call our animation function.
try {
    animate(aLink, bLink, cLink, dLink, canvas, ctx, startTime);
} catch(e) {
    alert(e);
}


