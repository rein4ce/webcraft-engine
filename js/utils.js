/*
 * Copyright (c) 2012 Michael Domanski
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

Math.sign = function(a)
{
	return a == 0 ? 0 : (a > 0 ? 1 : -1);
}

var Utils =
{
	sameSide: function(p1, p2, a, b)
	{
		var cp1, cp2;
		cp1 = new THREE.Vector3().sub(b, a).crossSelf( new THREE.Vector3().sub(p1, a) );
		cp2 = new THREE.Vector3().sub(b, a).crossSelf( new THREE.Vector3().sub(p2, a) );
		if (cp1.dot(cp2) >= 0)
			return true;
		return false;
	},

	isPointInsideTriangle: function(point, v1, v2, v3)
	{
		var p = new THREE.Vector3(point.x,point.y,0);
		var a = new THREE.Vector3(v1[0],v1[1],0);
		var b = new THREE.Vector3(v2[0],v2[1],0);
		var c = new THREE.Vector3(v3[0],v3[1],0);
		if ( this.sameSide(p,a, b,c) && this.sameSide(p,b, a,c) && this.sameSide(p,c, a,b) )
			return true;
		return false;
	},

	traverseGrid3D: function(startX, startY, startZ, endX, endY, endZ, mapWidth, mapHeight, mapDepth, gridSize)
	{
		var ret = [];

		mapWidth = mapWidth || 0;
		mapHeight = mapHeight || 0;
		mapDepth = mapDepth || 0;
		gridSize = gridSize || 1;

		startX += mapWidth / 2;
		startY += mapHeight / 2;
		startZ += mapDepth / 2;
		endX += mapWidth / 2;
		endY += mapHeight / 2;
		endZ += mapDepth / 2;

		startX /= gridSize;
		startY /= gridSize;
		startZ /= gridSize;
		endX /= gridSize;
		endY /= gridSize;
		endZ /= gridSize;

		// calculate the direction of the ray (linear algebra)
		var dirX = ( endX - startX );
		var dirY = ( endY - startY );
		var dirZ = ( endZ - startZ );
		var length = Math.sqrt( dirX * dirX + dirY * dirY + dirZ * dirZ );
		dirX /= length; // normalize the direction vector
		dirY /= length;
		dirZ /= length;


		var tDeltaX = 1.0 / Math.abs( dirX ); // how far we must move in the ray direction before we encounter a new voxel in x-direction
		var tDeltaY = 1.0 / Math.abs( dirY ); // same but y-direction
		var tDeltaZ = 1.0 / Math.abs( dirZ );

		// start voxel coordinates
		var x = Math.floor(startX);  // use your transformer function here
		var y = Math.floor(startY);
		var z = Math.floor(startZ);

		// end voxel coordinates
		var endX1 = Math.floor(endX);
		var endY1 = Math.floor(endY);
		var endZ1 = Math.floor(endZ);

		if ( startX == endX && startY == endY && startZ == endZ )
		{
			ret.push( new THREE.Vector3( x, y, z ) );
			return ret;
		}

		// decide which direction to start walking in
		var stepX = Math.sign( dirX );
		var stepY = Math.sign( dirY );
		var stepZ = Math.sign( dirZ );

		var tMaxX, tMaxY, tMaxZ;
		// calculate distance to first intersection in the voxel we start from
		if ( dirX < 0 )
		{
			tMaxX = ( x * 1.0 - startX ) / dirX;
		}
		else
		{
			tMaxX = ( ( x + 1 ) * 1.0 - startX ) / dirX;
		}

		if ( dirY < 0 )
		{
			tMaxY = ( y * 1.0 - startY ) / dirY;
		}
		else
		{
			tMaxY = ( ( y + 1 ) * 1.0 - startY ) / dirY;
		}

		if ( dirZ < 0 )
		{
			tMaxZ = ( z * 1.0 - startZ ) / dirZ;
		}
		else
		{
			tMaxZ = ( ( z + 1 ) * 1.0 - startZ ) / dirZ;
		}

		// check if first is occupied
		ret.push( new THREE.Vector3( x, y, z ) );

		var reachedX = false, reachedY = false, reachedZ = false;

		while ( true )
		{
			if ( tMaxX < tMaxY )
			{
				if ( tMaxX < tMaxZ )
				{
					tMaxX += tDeltaX;
					x += stepX;
				}
				else
				{
					tMaxZ += tDeltaZ;
					z += stepZ;
				}
			}
			else
			{
				if ( tMaxY < tMaxZ )
				{
					tMaxY += tDeltaY;
					y += stepY;
				}
				else
				{
					tMaxZ += tDeltaZ;
					z += stepZ;
				}
			}
			ret.push( new THREE.Vector3( x, y, z ) );


			if ( stepX > 0.0 )
			{
				if ( x >= endX1 )
				{
					reachedX = true;
				}
			}
		else if ( x <= endX1 )
		{
			reachedX = true;
		}

			if ( stepY > 0.0 )
			{
				if ( y >= endY1 )
				{
					reachedY = true;
				}
			}
		else if ( y <= endY1 )
		{
			reachedY = true;
		}

			if ( stepZ > 0.0 )
			{
				if ( z >= endZ1 )
				{
					reachedZ = true;
				}
			}
		else if ( z <= endZ1 )
		{
			reachedZ = true;
		}

			if (Math.sqrt(((x-startX)*(x-startX) + (y-startY)*(y-startY) + (z-startZ)*(z-startZ))) > length+1) break;

			if ( reachedX && reachedY && reachedZ )
			{
				break;
			}
		}

		return ret;
	}
}