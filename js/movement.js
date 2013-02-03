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

var Movement =
{
	singleMove: function(start, bboxMax, boxdir, displacement)
	{
		var triangles = TileMap.getTileTrianglesAlongVector(start, start.clone().addSelf(displacement), bboxMax.clone().multiplyScalar(2));
		var trace = this.trace(triangles, start, bboxMax, boxdir, displacement);
		return trace;
	},

	slideMove: function(start, bboxMax, boxdir, displacement)
	{
		var triangles = TileMap.getTileTrianglesAlongVector(start, start.clone().addSelf(displacement), bboxMax.clone().multiplyScalar(2));

		// try to move in the desired direction
		var trace = this.trace(triangles, start, bboxMax, boxdir, displacement);

		if (!trace.collision) return trace;

		// we collided and started to move along the next surface
		for (var i=0; i<3; i++)
		{
			triangles = TileMap.getTileTrianglesAlongVector(start, trace.endpoint, bboxMax.clone().multiplyScalar(2));
			var newDisp = trace.endpoint.subSelf(start);
			trace = this.trace(triangles, start, bboxMax, boxdir, newDisp);

			if (!trace.collision) return trace;
		}

		// If we're still blocked, don't move at all
		if (trace.collision) trace.newStart = start;

		return trace;
	},

	trace: function(triangles, start, bboxMax, boxdir, displacement)
	{
		var fraction = 1;
		var closest = new CollisionResult();
		var dist, mindist = 999999;
		var colliding = [];
		var size = new THREE.Vector3().copy(bboxMax).multiplyScalar(0.5);
		var dirNorm = displacement.clone().normalize().multiplyScalar(-1);
		var negdir = displacement.clone().multiplyScalar(-1);			// vector from end to start (pointing backwards)
		var maxNorm = 0;

		// find the collisions with the closest triangles
		for (var i=0; i<triangles.length; i++)
		{
			var t = triangles[i];

			var vlist = [ t[0], t[1], t[2] ];
			var trace = new CollisionResult();

			if (Collision.OBBPolygon(vlist, start, bboxMax, boxdir, displacement, trace))
			{
				if (trace.fraction <= fraction)// + 0.1)		// works perfectly without bias
				{
					t.normal = new THREE.Vector3().sub(t[2], t[0]).crossSelf( new THREE.Vector3().sub(t[1], t[0])).normalize().multiplyScalar(-1);

					// check if all points of our bbox are in front of the face
					var plane = new Plane(t[0], t[1], t[2]);
					var min = new THREE.Vector3().sub(start, bboxMax);
					var max = new THREE.Vector3().add(start, bboxMax);
					var result = { dist: 0 };

					fraction = trace.fraction;
					closest = trace;

					closest.normal = t.normal;
				}
			}
		}

		var dir = displacement;
		var endpoint = start;

		// if collided, process the collision
		if (fraction < 1)
		{
			var push = dir.clone().multiplyScalar(-(1-closest.fraction)).dot(closest.Nfirst);
			endpoint = start.clone().addSelf(displacement).addSelf(closest.Nfirst.multiplyScalar(push*1.1));	// from now on this is our destination point we need to go to

			//console.log(push, closest.Nfirst.multiplyScalar(push * 1.1))

			closest.slide = new THREE.Vector3();


			//endpoint = start.clone().addSelf(displacement).subSelf(closest.MTD);

			var dirLength = dir.length();							// length of the displacement
			var normal = closest.normal;

			var offset = normal.clone().multiplyScalar(0.01);		// how far we want to offset the push vector from the surface

			negdir.normalize();
			var offsetDot = 1/(normal.dot(negdir) || 0.0001);					// how much we have to be pushed by from the plane depending on the incomind angle (smaller angle - further push)
			offsetDot = Math.min(100, Math.max(offsetDot, -100));
			var offsetDist = negdir.multiplyScalar(offsetDot);		// push vector


			var f = closest.fraction;

			// we have to adjust the total fraction by the backoff amount
			// if we are nearing in at very low angle, we will be pushed off by quite a distance
			// so we need to take account of that in the total fraction traversed and make it up
			// during the slide movement next phase
			offsetDist.multiplyScalar(0.005);

			// 1) let's just move the box back before it collides
			//    this get's us exactly at the edge of the plane, so we are stuck

			// 2) Let's move it back to the collision point, and the further offset from the surface by the fixed distance of 0.05
			closest.newStart = start.clone().addSelf( dir.clone().multiplyScalar(fraction) );
			closest.newStart.addSelf(offsetDist);

		}
		else
		{
			closest.newStart = endpoint = start.clone().addSelf(dir);
		}

		closest.collision = fraction != 1;
		closest.endpoint = endpoint;
		return closest;
	},

	clipVelocity: function(dir, normal, overbounce)
	{
		var backoff = dir.dot(normal);
		if ( backoff < 0 )
			backoff *= overbounce;
		else
			backoff /= overbounce;

		return new THREE.Vector3(
			dir.x - normal.x * backoff,
			dir.y - normal.y * backoff,
			dir.z - normal.z * backoff
		);
	}
}