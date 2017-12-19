 
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


