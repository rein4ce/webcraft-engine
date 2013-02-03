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

var PlaneSide =
{
	Front: 0,
	Back: 1,
	OnPlane: 2
}

var Plane = function(a, b, c)
{
	var left = new THREE.Vector3().sub(c, a);
	var right = new THREE.Vector3().sub(b, a);

	this.normal = new THREE.Vector3().cross(left, right).normalize().multiplyScalar(-1);
	this.dist = -a.dot(this.normal);
}

Plane.prototype.getDistance = function(point)
{
	return point.dot(this.normal) + this.dist;
}

Plane.prototype.getSide = function(pt, result)
{
	var dist = this.getDistance(pt);
	if (result) result.dist = dist;

	if (dist > 0.001) return PlaneSide.Front;
	if (dist < -0.001) return PlaneSide.Back;
	return PlaneSide.OnPlane;
}

var CollisionResult = function()
{
	this.collision = false;
	this.MTD = null;
	this.normal = null;
	this.fraction = 1;
	this.endpoint = null;
	this.slide = new THREE.Vector3();
}


var Collision =
{
	lineTriangle: function(v1, v2, v3, start, end, result)
	{
		var u = new THREE.Vector3().sub(v2, v1);
		var v = new THREE.Vector3().sub(v3, v1);
		var n = new THREE.Vector3().cross(u, v);

		if (n.lengthSq() == 0) return false;

		var dir = new THREE.Vector3().sub(end, start);
		var w0 = new THREE.Vector3().sub(start, v1);
		var a = -n.dot(w0);
		var b = n.dot(dir);

		if (Math.abs(b) < 0.0001) return false;

		var r = a / b;
		if (r < 0) return false;
		if (r > 1) return false;

		var I = start.clone().addSelf(dir.multiplyScalar(r));
		var uu, uv, vv, wu, wv, D;
		uu = u.dot(u);
		uv = u.dot(v);
		vv = v.dot(v);
		var w = new THREE.Vector3().sub(I, v1);
		wu = w.dot(u);
		wv = w.dot(v);
		D = uv * uv - uu * vv;

		var s, t;
		s = (uv * wv - vv * wu) / D;
		if (s < 0.0 || s > 1.0)        // I is outside T
			return false;
		t = (uv * wu - uu * wv) / D;
		if (t < 0.0 || (s + t) > 1.0)  // I is outside T
			return false;

		if (result) result.fraction = r;

		return true;                      // I is in T
	},

	// internal state for passing between collision routines
	polygon: null,
	start: null,
	size: null,
	dir: null,
	displacement: null,
	tolerance: null,
	collision: null,
	mtdsquared: null,
	MTD: null,
	tfirst: null,
	Nfirst: null,
	tlast: null,
	Nlast: null,
	axis: null,

	OBBPolygon: function(polygon, start, size, dir, displacement, result)
	{
		var tolerance 	= 0.001;

		// copy to internal state
		this.polygon = polygon;
		this.start = start;
		this.size = size;
		this.dir = dir;
		this.displacement = displacement;

		// reset state
		this.collision 	= false;
		this.mtdsquared	= -1.0;
		this.MTD			= new THREE.Vector3();
		this.tfirst		= -tolerance;
		this.Nfirst		= new THREE.Vector3();
		this.tlast 		= 1 + tolerance;
		this.Nlast		= new THREE.Vector3();
		this.axis		= null;

		// get polygon normal and test using this axis
		var cross = this.axis = new THREE.Vector3().sub(polygon[2], polygon[1]).crossSelf( new THREE.Vector3().sub(polygon[1], polygon[0]));
		if (!this.intervalCollision()) return false;

		// test all 3 axis of the box
		for (var i=0; i<3; i++)
		{
			this.axis = this.dir[i];
			if (!this.intervalCollision()) return false;
		}

		// test polygon edges
		for (var l = 0; l < 3; l++ )
		{
			var j = polygon.length - 1;
			for ( var i = 0; i < polygon.length; j = i, i++ )
			{
				this.axis = new THREE.Vector3().cross( dir[l], new THREE.Vector3().sub(polygon[i], polygon[j]) );

				if ( this.axis.dot(this.axis ) < 0.00001 )
				continue;

				if ( !this.intervalCollision() ) return false;
			}
		}

		if (this.collision)
		{
			// check if we found a valid time of collision
			if (this.tfirst < 0 || this.tfirst > 1) return false;

			this.Nfirst.normalize();
		}
		else
		{
			this.tfirst = 0;
			this.Nfirst.copy(this.MTD).normalize();
		}

		if (result)
		{
			result.collision = this.collision;
			result.fraction = this.tfirst;
			result.MTD = this.MTD.clone().normalize();
			result.normal = new THREE.Vector3(this.Nfirst.x, this.Nfirst.y, this.Nfirst.z);
			result.edge = this.edge;
			result.Nfirst = this.Nfirst;
		}

		return true;
	},

	intervalCollision: function()
	{
		var a = { min: 0, max: 0 };
		var b = { min: 0, max: 0 };

		this.calculatePolygonIntervalOnAxis(a);
		this.calculateBoxIntervalOnAxis(b);

		var disp = this.displacement.dot(this.axis);

		return this.slabSlabCollision(a.min, a.max, b.min, b.max, disp);
	},

	slabSlabCollision: function(amin, amax, bmin, bmax, displacement)
	{
		var dist_0 = amin - bmax;
		var dist_1 = amax - bmin;
		var intersect = dist_0 < 0 && dist_1 > 0;

		// we are already intersecting, we need to be pushed outside ASAP
		if (intersect)
		{
			var axisMtd = (Math.abs(dist_0) < Math.abs(dist_1)) ? dist_0 : dist_1;
			var axisLengthSquared = this.axis.lengthSq();
			var axisMtd3D = new THREE.Vector3().copy(this.axis).multiplyScalar(axisMtd / axisLengthSquared);
			var axisMtd3DLengthSquared = axisMtd3D.lengthSq();

			// check if that push vector is smaller than our current push vector
			if (axisMtd3DLengthSquared < this.mtdsquared || this.mtdsquared < 0)
			{
				this.MTD.copy(axisMtd3D);
				this.mtdsquared = axisMtd3DLengthSquared;
			}
		}

		// if not moving, then we can only collide through intersections
		if (Math.abs(displacement) < 0.000001) return intersect;

		// we are not colliding yet, check if we collide when we move
		var tslab0 = dist_0 / displacement;
		var tslab1 = dist_1 / displacement;
		var tslabenter,
			tslabexit,
			sign;

		// we are entering collision from the left
		if (tslab0 < tslab1)
		{
			tslabenter = tslab0;
			tslabexit = tslab1;
			sign = -1;
		}
		else
		{
			tslabenter = tslab1;
			tslabexit = tslab0;
			sign = 1;
		}

		// did this collision happen sooner then any other collision?
		if ( tslabenter > this.tfirst )
		{
			this.tfirst = tslabenter;
			this.Nfirst.copy(this.axis).multiplyScalar(sign);
			this.collision = true;
		}

		if ( tslabexit < this.tlast )
		{
			this.tlast = tslabexit;
			this.Nlast.copy(this.axis).multiplyScalar(-sign);
		}

		if ( this.tlast < this.tfirst )
			return false;

		return true;
	},

	calculatePolygonIntervalOnAxis: function(v)
	{
		v.min = 0; v.max = 0;
		v.min = v.max = this.polygon[0].dot(this.axis);

		for (var i=1; i<this.polygon.length; i++)
		{
			var p = this.polygon[i].dot(this.axis);
			if ( p < v.min ) v.min = p;
			else if ( p > v.max ) v.max = p;
		}
	},

	calculateBoxIntervalOnAxis: function(v)
	{
		var p = this.start.dot(this.axis);
		var ry = Math.abs( this.dir[1].dot(this.axis) ) * this.size.y;
		var rx = Math.abs( this.dir[0].dot(this.axis) ) * this.size.x;
		var rz = Math.abs( this.dir[2].dot(this.axis) ) * this.size.z;
		var r  = rx + ry + rz;
		v.min = p - r;
		v.max = p + r;
	}
}