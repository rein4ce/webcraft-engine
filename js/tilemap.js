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

var Tile = function(type)
{
	this.type = type || 0;
	this.rotation = 0;
	this.brightness = 1;
}

Tile.prototype.isNodeOccupied = function(node)
{
	if (this.type == 0) return false;
	return TileTypes[this.type].meshes[this.rotation].nodes[node];
}

Tile.prototype.isSideVisible = function(x, y, z, side)
{
	if (side == TileSide.None) return true;

	var clip = TileTypes[this.type].meshes[this.rotation].faces[side].type;

	switch (side)
	{
		case TileSide.Left:	x--; break;
		case TileSide.Right:	x++; break;
		case TileSide.Front:	z++; break;
		case TileSide.Back:	z--; break;
		case TileSide.Top:		y++; break;
		case TileSide.Bottom:	y--; break;
	}

	var tile = TileMap.getTile(x,y,z);
	if (!tile || tile.type == 0) return true;

	var neighbourSide = Tileset.opposite[side];
	var neighbourFace = tile.getTileClipFace(neighbourSide);
	var clips = false;

	switch (side)
	{
		case TileSide.Left:
		case TileSide.Right:
		case TileSide.Front:
		case TileSide.Back:
			clips = (Tileset.clipHorizontal[neighbourFace] & (1 << clip)) != 0;
			return !clips;

		case TileSide.Top:
		case TileSide.Bottom:
			clips = (Tileset.clipVertical[neighbourFace] & (1 << clip)) != 0;
			return !clips;
	}

	return true;
}

Tile.getTileUV = function( tile, tileU, tileV )
{
	var x = tile % Tileset.TilesWidth;
	var y = Math.floor(tile / Tileset.TilesWidth);
	var outU = (x + tileU * 0.98 + 0.01) * 1/16;
	var outV = (y + tileV * 0.98 + 0.01) * 1/16;
	return new THREE.UV(outU, 1-outV);
}

Tile.prototype.getCollideTriangles = function(x, y, z)
{
	var ret = [];
	if (this.type == 0) return ret;

	var type = TileTypes[this.type];
	var mesh = type.collisionMeshes[this.rotation];
	var pos = new THREE.Vector3(x,y,z);

	for (var f=0; f<7; f++)
	{
		if (this.isSideVisible(x, y, z, f))
		{
			var face = mesh.faces[f];
			for (var i=0; i<face.indices.length; i++)
			{
				//if (f!=0 || i!=0) continue;	// TODO
				var t = mesh.triangles[face.indices[i]];
				ret.push([
					new THREE.Vector3().add(mesh.vertices[t.vertices[0]], pos),
					new THREE.Vector3().add(mesh.vertices[t.vertices[1]], pos),
					new THREE.Vector3().add(mesh.vertices[t.vertices[2]], pos)
				]);
				//return ret;	// TODO
			}
		}
	}

	return ret;
}

Tile.prototype.getTileClipFace = function(side)
{
	if (this.type == 0) return 0;
	return TileTypes[this.type].meshes[this.rotation].faces[side].type;
}

var TileMapChunk = function(x, y, z)
{
	this.x = x;
	this.y = y;
	this.z = z;
	this.dirty = true;
	this.geometry = null;
	this.mesh = null;

	this.recreate();
}

function getNodeLeft(node, y, z)
{
	switch (node)
	{
		case 0:
			if (y == 0 && z == 0) return 1;
			if (y == 0 && z == -1) return 2;
			if (y == 1 && z == -1) return 6;
			if (y == 1 && z == 0) return 5;
			break;

		case 1:
			if (y == 0 && z == 0) return 2;
			if (y == 0 && z == 1) return 1;
			if (y == 1 && z == 1) return 5;
			if (y == 1 && z == 0) return 6;
			break;

		case 2:
			if (y == 0 && z == 0) return 6;
			if (y == 0 && z == 1) return 5;
			if (y == -1 && z == 1) return 1;
			if (y == -1 && z == 0) return 2;
			break;

		case 3:
			if (y == 0 && z == 0) return 5;
			if (y == 0 && z == -1) return 6;
			if (y == -1 && z == -1) return 2;
			if (y == -1 && z == 0) return 1;
			break;
	}
}

function getNodeRight(node, y, z)
{
	switch (node)
	{
		case 0:
			if (y == 0 && z == 0) return 3;
			if (y == 0 && z == 1) return 0;
			if (y == 1 && z == 1) return 4;
			if (y == 1 && z == 0) return 7;
			break;

		case 1:
			if (y == 0 && z == 0) return 0;
			if (y == 0 && z == -1) return 3;
			if (y == 1 && z == -1) return 7;
			if (y == 1 && z == 0) return 4;
			break;

		case 2:
			if (y == 0 && z == 0) return 4;
			if (y == 0 && z == -1) return 7;
			if (y == -1 && z == -1) return 3;
			if (y == -1 && z == 0) return 0;
			break;

		case 3:
			if (y == 0 && z == 0) return 7;
			if (y == 0 && z == 1) return 4;
			if (y == -1 && z == 1) return 0;
			if (y == -1 && z == 0) return 3;
			break;
	}
}

function getNodeFront(node, x, y)
{
	switch (node)
	{
		case 0:
			if (y == 0 && x == 0) return 0;
			if (y == 0 && x == -1) return 2;
			if (y == 1 && x == -1) return 6;
			if (y == 1 && x == 0) return 7;
			break;

		case 1:
			if (y == 0 && x == 0) return 1;
			if (y == 0 && x == 1) return 3;
			if (y == 1 && x == 1) return 7;
			if (y == 1 && x == 0) return 6;
			break;

		case 2:
			if (y == 0 && x == 0) return 5;
			if (y == 0 && x == 1) return 7;
			if (y == -1 && x == 1) return 3;
			if (y == -1 && x == 0) return 2;
			break;

		case 3:
			if (y == 0 && x == 0) return 4;
			if (y == 0 && x == -1) return 6;
			if (y == -1 && x == -1) return 2;
			if (y == -1 && x == 0) return 3;
			break;
	}
}

function getNodeBack(node, x, y)
{
	switch (node)
	{
		case 0:
			if (y == 0 && x == 0) return 2;
			if (y == 0 && x == 1) return 0;
			if (y == 1 && x == 1) return 4;
			if (y == 1 && x == 0) return 5;
			break;

		case 1:
			if (y == 0 && x == 0) return 3;
			if (y == 0 && x == -1) return 1;
			if (y == 1 && x == -1) return 5;
			if (y == 1 && x == 0) return 4;
			break;

		case 2:
			if (y == 0 && x == 0) return 7;
			if (y == 0 && x == -1) return 5;
			if (y == -1 && x == -1) return 1;
			if (y == -1 && x == 0) return 0;
			break;

		case 3:
			if (y == 0 && x == 0) return 6;
			if (y == 0 && x == 1) return 4;
			if (y == -1 && x == 1) return 0;
			if (y == -1 && x == 0) return 1;
			break;
	}
}

function getNodeTop(node, x, z)
{
	switch (node)
	{
		case 0:
			if (z == 0 && x == 0) return 4;
			if (z == 0 && x == -1) return 5;
			if (z == -1 && x == -1) return 6;
			if (z == -1 && x == 0) return 7;
			break;

		case 1:
			if (z == 0 && x == 0) return 5;
			if (z == 0 && x == 1) return 4;
			if (z == -1 && x == 1) return 7;
			if (z == -1 && x == 0) return 6;
			break;

		case 2:
			if (z == 0 && x == 0) return 6;
			if (z == 0 && x == 1) return 7;
			if (z == 1 && x == 1) return 4;
			if (z == 1 && x == 0) return 5;
			break;

		case 3:
			if (z == 0 && x == 0) return 7;
			if (z == 0 && x == -1) return 6;
			if (z == 1 && x == -1) return 5;
			if (z == 1 && x == 0) return 4;
			break;
	}
}

function getNodeBottom(node, x, z)
{
	switch (node)
	{
		case 1:
			if (z == 0 && x == 0) return 0;
			if (z == 0 && x == -1) return 1;
			if (z == -1 && x == -1) return 2;
			if (z == -1 && x == 0) return 3;
			break;

		case 0:
			if (z == 0 && x == 0) return 1;
			if (z == 0 && x == 1) return 0;
			if (z == -1 && x == 1) return 3;
			if (z == -1 && x == 0) return 2;
			break;

		case 3:
			if (z == 0 && x == 0) return 2;
			if (z == 0 && x == 1) return 3;
			if (z == 1 && x == 1) return 0;
			if (z == 1 && x == 0) return 1;
			break;

		case 2:
			if (z == 0 && x == 0) return 3;
			if (z == 0 && x == -1) return 2;
			if (z == 1 && x == -1) return 1;
			if (z == 1 && x == 0) return 0;
			break;
	}
}

TileMapChunk.prototype =
{
	getFaceLightingLevels: function(_x, _y, _z, f)
	{
		var ambient = [0,0,0,0];
		var d = [0,0,0];

		function calcLeft(i, d, n)
		{
			var x = _x, y = _y, z = _z; var node;
			if ((node = TileMap.getTile(x+d[0], y, z+d[2])) && node.isNodeOccupied(n ? getNodeLeft(i,0,d[2]) : getNodeRight(i,0,d[2])) && (node = TileMap.getTile(x+d[0], y+d[1], z)) && node.isNodeOccupied(n ? getNodeLeft(i,d[1],0) : getNodeRight(i,0,d[2]))) ambient[i] = 0.75; else
			if ((node = TileMap.getTile(x+d[0], y, z+d[2])) && node.isNodeOccupied(n ? getNodeLeft(i,0,d[2]) : getNodeRight(i,0,d[2])) && (node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeLeft(i,d[1],d[2]) : getNodeRight(i,0,d[2])) && (node = TileMap.getTile(x,y+d[1],z)) && node.isNodeOccupied(n ? getNodeLeft(i,d[1],0) : getNodeRight(i,d[1],0))) ambient[i] = 0.5; else
			if ((node = TileMap.getTile(x+d[0], y+d[1], z)) && node.isNodeOccupied(n ? getNodeLeft(i,d[1],0) : getNodeRight(i,d[1],0)) && (node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeLeft(i,d[1],d[2]) : getNodeRight(i,d[1],d[2])) && (node = TileMap.getTile(x,y,z+d[2])) && node.isNodeOccupied(n ? getNodeLeft(i,0,d[2]) : getNodeRight(i,0,d[2]))) ambient[i] = 0.5; else
			if ((node = TileMap.getTile(x+d[0], y, z+d[2])) && node.isNodeOccupied(n ? getNodeLeft(i,0,d[2]) : getNodeRight(i,0,d[2])) ||  ((node = TileMap.getTile(x+d[0], y+d[1], z)) && node.isNodeOccupied(n ? getNodeLeft(i,d[1],0) : getNodeRight(i,d[1],0))) || ((node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeLeft(i,d[1],d[2]) : getNodeRight(i,d[1],d[2])))) ambient[i] = 0.25;
			if ((node = TileMap.getTile(x+d[0], y, z)) && node.isNodeOccupied(n ? getNodeLeft(i,0,0) : getNodeRight(i,0,0))) ambient[i] += 0.25;
		}

		function calcFront(i, d, n)
		{
			var x = _x, y = _y, z = _z; var node;
			if ((node = TileMap.getTile(x+d[0], y, z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,d[0],0) : getNodeBack(i,d[0],0)) && (node = TileMap.getTile(x, y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,0,d[1]) : getNodeBack(i,0,d[1]))) ambient[i] = 0.75; else
			if ((node = TileMap.getTile(x+d[0], y, z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,d[0],0) : getNodeBack(i,d[0],0)) && (node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,d[0],d[1]) : getNodeBack(i,d[0],d[1])) && (node = TileMap.getTile(x,y+d[1],z)) && node.isNodeOccupied(n ? getNodeFront(i,0,d[1]) : getNodeBack(i,0,d[1]))) ambient[i] = 0.5; else
			if ((node = TileMap.getTile(x, y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,0,d[1]) : getNodeBack(i,0,d[1])) && (node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,d[0],d[1]) : getNodeBack(i,d[0],d[1])) && (node = TileMap.getTile(x+d[0],y,z)) && node.isNodeOccupied(n ? getNodeFront(i,d[0],0) : getNodeBack(i,d[0],0))) ambient[i] = 0.5; else
			if ((node = TileMap.getTile(x+d[0], y, z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,d[0],0) : getNodeBack(i,d[0],0)) ||  ((node = TileMap.getTile(x, y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,0,d[1]) : getNodeBack(i,0,d[1]))) || ((node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeFront(i,d[0],d[1]) : getNodeBack(i,d[0],d[1])))) ambient[i] = 0.25;
			if ((node = TileMap.getTile(x, y, z+d[2])) && node.isNodeOccupied(n ? getNodeLeft(i,0,0) : getNodeRight(i,0,0))) ambient[i] += 0.25;
		}

		function calcTop(i, d, n)
		{
			var x = _x, y = _y, z = _z; var node;
			if ((node = TileMap.getTile(x, y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeTop(i,0,d[2]) : getNodeBottom(i,0,d[2])) && (node = TileMap.getTile(x+d[0], y+d[1], z)) && node.isNodeOccupied(n ? getNodeTop(i,d[0],0) : getNodeBottom(i,d[0],0))) ambient[i] = 0.75; else
			if ((node = TileMap.getTile(x, y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeTop(i,0,d[2]) : getNodeBottom(i,0,d[2])) && (node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeTop(i,d[0],d[2]) : getNodeBottom(i,d[0],d[2])) && (node = TileMap.getTile(x+d[0],y,z)) && node.isNodeOccupied(n ? getNodeTop(i,d[0],0) : getNodeBottom(i,d[0],0))) ambient[i] = 0.5; else
			if ((node = TileMap.getTile(x+d[0], y+d[1], z)) && node.isNodeOccupied(n ? getNodeTop(i,d[0],0) : getNodeBottom(i,d[0],0)) && (node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeTop(i,d[0],d[2]) : getNodeBottom(i,d[0],d[2])) && (node = TileMap.getTile(x,y,z+d[2])) && node.isNodeOccupied(n ? getNodeTop(i,0,d[2]) : getNodeBottom(i,0,d[2]))) ambient[i] = 0.5; else
			if ((node = TileMap.getTile(x, y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeTop(i,0,d[2]) : getNodeBottom(i,0,d[2])) ||  ((node = TileMap.getTile(x+d[0], y+d[1], z)) && node.isNodeOccupied(n ? getNodeTop(i,d[0],0) : getNodeBottom(i,d[0],0))) || ((node = TileMap.getTile(x+d[0], y+d[1], z+d[2])) && node.isNodeOccupied(n ? getNodeTop(i,d[0],d[2]) : getNodeBottom(i,d[0],d[2])))) ambient[i] = 0.25;
			if ((node = TileMap.getTile(x, y+d[1], z)) && node.isNodeOccupied(n ? getNodeTop(i,0,0) : getNodeBottom(i,0,0))) ambient[i] += 0.25;
		}


		if (f == TileSide.Left)
		{
			calcLeft(0, [-1,+1,-1], true);
			calcLeft(1, [-1,+1,+1], true);
			calcLeft(2, [-1,-1,+1], true);
			calcLeft(3, [-1,-1,-1], true);
		}
		else if (f == TileSide.Front)
		{
			calcFront(0, [-1,+1,+1], true);
			calcFront(1, [+1,+1,+1], true);
			calcFront(2, [+1,-1,+1], true);
			calcFront(3, [-1,-1,+1], true);
		}
		else if (f == TileSide.Right)
		{
			calcLeft(0, [+1,+1,+1], false);
			calcLeft(1, [+1,+1,-1], false);
			calcLeft(2, [+1,-1,-1], false);
			calcLeft(3, [+1,-1,+1], false);
		}
		else if (f == TileSide.Back)
		{
			calcFront(0, [+1,+1,-1], false);
			calcFront(1, [-1,+1,-1], false);
			calcFront(2, [-1,-1,-1], false);
			calcFront(3, [+1,-1,-1], false);
		}
		else if (f == TileSide.Top)
		{
			calcTop(0, [-1,+1,-1], true);
			calcTop(1, [+1,+1,-1], true);
			calcTop(2, [+1,+1,+1], true);
			calcTop(3, [-1,+1,+1], true);
		}
		else if (f == TileSide.Bottom)
		{
			calcTop(0, [+1,-1,-1], false);
			calcTop(1, [-1,-1,-1], false);
			calcTop(2, [-1,-1,+1], false);
			calcTop(3, [+1,-1,+1], false);
		}

		return ambient;
	},

	recreate: function()
	{
		if (this.mesh)
		{
			Engine.scene.remove(this.mesh);
			this.mesh = null;
		}

		this.geometry = new THREE.Geometry();

		for (var x = this.x * TileMapChunk.Size; x < this.x * TileMapChunk.Size + TileMapChunk.Size; x++)
			for (var y = this.y * TileMapChunk.Size; y < this.y * TileMapChunk.Size + TileMapChunk.Size; y++)
				for (var z = this.z * TileMapChunk.Size; z < this.z * TileMapChunk.Size + TileMapChunk.Size; z++)
				{
					var tile = TileMap.getTile(x,y,z);
					if (!tile || tile.type == 0) continue;

					var type = TileTypes[tile.type];
					if (!type.meshes[tile.rotation]) continue;

					var offset = this.geometry.vertices.length;
					var mesh = type.meshes[tile.rotation];
					var vertices = mesh.vertices;
					var triangles = mesh.triangles;
					var uvs = mesh.uvs;

					var neighbours =
					[
						TileMap.getTile(x, y, z+1),		// front
						TileMap.getTile(x, y, z-1),		// back
						TileMap.getTile(x-1, y, z),		// left
						TileMap.getTile(x+1, y, z),		// right
						TileMap.getTile(x, y+1, z),		// top
						TileMap.getTile(x, y-1, z)		// bottom
					];

					// add vertices
					for (var i=0; i<vertices.length; i++)
					{
						var v = vertices[i];
						this.geometry.vertices.push(new THREE.Vector3(
							v.x + x,
							v.y + y,
							v.z + z
						));
					}

					// add triangles
					for (var f=0; f<mesh.faces.length; f++)
					{
						if (!tile.isSideVisible(x, y, z, f)) continue;

						var face = mesh.faces[f];

						var ambient = this.getFaceLightingLevels(x, y, z, f);


						for (var i=0; i<face.indices.length; i++)
						{
							//if (f!=0 || i!=0) continue;//TODO

							var t = triangles[face.indices[i]];
							var triangle = new THREE.Face3(
								offset + t.vertices[0],
								offset + t.vertices[1],
								offset + t.vertices[2]
							);
							this.geometry.faces.push(triangle);

							var color = 0xFFFFFF;
							if (f < 6)
							{
								var n = neighbours[f];
								if (n && n.brightness == 0) color = 0x888888;
							}
							else
							{
								color = tile.brightness ? 0xFFFFFF : 0x888888;
							}

							var T = type.meshes[0].triangles[face.indices[i]];

							// tile index in the tileset used by this face
							// (determined by the normal of the face)
							var tileIndex = 0;
							if (T.normal.x < -0.5) tileIndex = type.textures[TileSide.Left];
							if (T.normal.x >  0.5) tileIndex = type.textures[TileSide.Right];
							if (T.normal.z < -0.5) tileIndex = type.textures[TileSide.Front];
							if (T.normal.z >  0.5) tileIndex = type.textures[TileSide.Back];
							if (T.normal.y <= -0.5) tileIndex = type.textures[TileSide.Bottom];
							if (T.normal.y >=  0.5) tileIndex = type.textures[TileSide.Top];

							var tuvs = [
								[ t.uvs[0][0], t.uvs[0][1] ],
								[ t.uvs[1][0], t.uvs[1][1] ],
								[ t.uvs[2][0], t.uvs[2][1] ]
							];

							if (T.normal.y <= -0.5 || T.normal.y >= 0.5)
							{
								for (var k=0; k<3; k++)
								{
									switch (tile.rotation)
									{
										case 1:
											tuvs[k] = [ 1-tuvs[k][1], tuvs[k][0] ];
											break;

										case 2:
											tuvs[k] = [ 1-tuvs[k][0], 1-tuvs[k][1] ];
											break;

										case 3:
											tuvs[k] = [ tuvs[k][1], 1-tuvs[k][0] ];
											break;
									}
								}
							}

							var uvs = [
								Tile.getTileUV( tileIndex, tuvs[0][0], tuvs[0][1]),
								Tile.getTileUV( tileIndex, tuvs[1][0], tuvs[1][1]),
								Tile.getTileUV( tileIndex, tuvs[2][0], tuvs[2][1])
							];

							this.geometry.faceVertexUvs[0].push(uvs);

							// embed ambient occlusion for vertex colors
							var colors = [ new THREE.Color(color), new THREE.Color(color), new THREE.Color(color) ];

							for (var j=0; j<3; j++)
							{
								var uv = t.uvs[j];
								var u = uv[0];
								var v = uv[1];
								var level = 0;

								if (u == 0)
								{
									if (v == 0)
										level = ambient[0];
									else if (v == 1)
										level = ambient[3];
								}
								else if (u == 1)
								{
									if (v == 0)
										level = ambient[1];
									else if (v == 1)
										level = ambient[2];
								}

								colors[j].r *= 1 - level * 1.1;
								colors[j].g *= 1 - level * 1.1;
								colors[j].b *= 1 - level * 1.1;
							}

							// face vertex colors
							triangle.vertexColors = colors;
						}
					}
				}



		// compute normals
		this.geometry.computeFaceNormals();

		// create mesh if doesn't exist
		if (!this.mesh)
		{
			this.mesh = new THREE.Mesh(this.geometry, TileMap.material);
			Engine.scene.add(this.mesh);
		}
		else
		{
			this.mesh.geometry = this.geometry;
		}

		this.dirty = false;
	}
}

TileMapChunk.Size = 8;			// size of the chunk in tiles


var TileType = function(name, meshes, collisionMeshes, textures)
{
	this.index = -1;
	this.name = name;
	this.meshes = meshes;				// meshes for each rotation
	this.collisionMeshes = collisionMeshes;
	this.textures = textures || [];
	this.transparent = false;
	this.mesh = null;
	this.castShadow = false;

	if (textures && !textures.length) this.textures = [textures,textures,textures,textures,textures,textures];
}

var TileSide =
{
	Front:		0,
	Back:		1,
	Left:		2,
	Right:		3,
	Top:		4,
	Bottom:		5,
	None:		6					// indicates no particular side
};

var TileMeshFace = function(type, triangleIndices)
{
	this.type = type;				// shape type of this face (for culling)
	this.indices = triangleIndices;	// indices of triangles
}

var TileMesh = function()
{
	this.vertices = [];				// all vertices making up the mesh of this tile
	this.triangles = [];			// all triangles of this mesh
	this.faces = new Array(7);		// 6 sides of the tile + loose triangles
	this.textures = new Array(6);	// textures for each side
	this.nodes = [false, false, false, false, false, false, false, false];
	this.castShadow = false;
}

TileMesh.prototype.assignFaces = function()
{
	for (var i=0; i<7; i++)
		this.faces[i] = new TileMeshFace(0, []);

	for (var i=0; i<this.triangles.length; i++)
	{
		var t = this.triangles[i];
		var a = this.vertices[t.vertices[0]];
		var b = this.vertices[t.vertices[1]];
		var c = this.vertices[t.vertices[2]];

		if (a.z == 1 && a.z == b.z && c.z == b.z) this.faces[TileSide.Front].indices.push(i); else
		if (a.z == 0 && a.z == b.z && c.z == b.z) this.faces[TileSide.Back].indices.push(i); else
		if (a.y == 1 && a.y == b.y && c.y == b.y) this.faces[TileSide.Top].indices.push(i); else
		if (a.y == 0 && a.y == b.y && c.y == b.y) this.faces[TileSide.Bottom].indices.push(i); else
		if (a.x == 1 && a.x == b.x && c.x == b.x) this.faces[TileSide.Right].indices.push(i); else
		if (a.x == 0 && a.x == b.x && c.x == b.x) this.faces[TileSide.Left].indices.push(i); else
			this.faces[TileSide.None].indices.push(i);
	}

	// additionaly check if corners are occupied
	for (var i=0; i<this.vertices.length; i++)
	{
		var v = this.vertices[i];
		if (v.x == 0 && v.y == 1 && v.z == 0) this.nodes[0] = true;
		if (v.x == 1 && v.y == 1 && v.z == 0) this.nodes[1] = true;
		if (v.x == 1 && v.y == 1 && v.z == 1) this.nodes[2] = true;
		if (v.x == 0 && v.y == 1 && v.z == 1) this.nodes[3] = true;
		if (v.x == 0 && v.y == 0 && v.z == 0) this.nodes[4] = true;
		if (v.x == 1 && v.y == 0 && v.z == 0) this.nodes[5] = true;
		if (v.x == 1 && v.y == 0 && v.z == 1) this.nodes[6] = true;
		if (v.x == 0 && v.y == 0 && v.z == 1) this.nodes[7] = true;
	}
}

var TileTriangle = function(vertices, normal, uvs)
{
	this.vertices = vertices;
	this.normal = normal;
	this.uvs = uvs;
	this.textureIndex = 0;			// texture index used for that face, depending which direction it's facing
}




var Tileset =
{
	RasterSize: 16,
	TilesWidth: 16,

	opposite: [
		TileSide.Back,
		TileSide.Front,
		TileSide.Right,
		TileSide.Left,
		TileSide.Bottom,
		TileSide.Top
	],
	empty: null,
	meshes: [],
	tiles: [],
	clipHorizontal: [],
	clipVertical: [],
	loader: null,

	init: function()
	{

	},

	load: function(filename, callback)
	{
		filename = filename || "models/tileset.obj";
		this.tiles = [];
		this.meshes = [];
		this.clipHorizontal = [];
		this.clipVertical = [];

		this.loader = new THREE.OBJLoader();
		this.loader.addEventListener("load", function(event)
		{
			console.log("Tileset loaded");

			var model = event.content;
			var geom = model.children[0].geometry;
			var precision = 0.01;
			var faceTypes = [];

			// create empty tile first
			this.empty = new TileType("empty", null, null, []);
			this.tiles.push(this.empty);

			var emptyClipFaces = [0,0,0,0,0,0];
			var emptyMesh = new TileMesh();

			for (var i=0; i<7; i++)	emptyMesh.faces[i] = new TileMeshFace(0, []);
			this.meshes.push([
				emptyMesh,
				emptyMesh,
				emptyMesh,
				emptyMesh
			]);

			// empty face tile
			var emptyFace = new Array(this.RasterSize * this.RasterSize);
			for (var i=0; i<emptyFace.length; i++) emptyFace[i] = 0;
			emptyFace = emptyFace.join("");
			faceTypes.push(emptyFace);
			this.clipHorizontal.push(0);
			this.clipVertical.push(0);

			// group geometries (faces)
			var groups = [];

			for (var i=0; i<geom.faces.length; i++)
			{
				var face = geom.faces[i];
				var v = [
					geom.vertices[face.a],
					geom.vertices[face.b],
					geom.vertices[face.c]
				];

				var index = ((Math.min(v[0].x, Math.min(v[1].x, v[2].x)))/2)|0;
				groups[index] = groups[index] || [];
				groups[index].push(i);
			}

			// interate over each group found in the model file
			// and create each of four rotations
			for (var g=0; g<groups.length; g++)
			{
				var group = groups[g];
				var tileMeshes = new Array(4);

				// create a tile mesh for each rotation of the tile
				for (var rot=0; rot<4; rot++)
				{
					var mesh = new TileMesh();
					tileMeshes[rot] = mesh;

					// get map of all vertices used in this group
					var verticesMap = {};
					var vertices = [];
					var faces = [];
					var newMap = {};

					for (var i=0; i<group.length; i++)
					{
						var faceIndex = group[i];
						verticesMap[geom.faces[faceIndex].a] = geom.vertices[geom.faces[faceIndex].a];
						verticesMap[geom.faces[faceIndex].b] = geom.vertices[geom.faces[faceIndex].b];
						verticesMap[geom.faces[faceIndex].c] = geom.vertices[geom.faces[faceIndex].c];
					}

					// create a new array of these vertices (changing their indexes)
					$.each(verticesMap, function(i, v)
					{
						var vert = new THREE.Vector3(
							parseFloat((v.x -g*2).toFixed(2)),
							parseFloat(v.y.toFixed(2)),
							parseFloat(v.z.toFixed(2))
						);
						vertices.push(vert);

						// rotate
						for (var r=0; r<4-rot; r++)
						{
							var a = vert.x;
							vert.x = vert.z;
							vert.z = a;
							vert.x = 1 - vert.x;
						}

						switch (rot)
						{
							case 1:
								vert.x += 1;
								vert.z -= 1;
								break;

							case 2:
								vert.z -= 2;
								break;

							case 3:
								vert.x -= 1;
								vert.z -= 1;
								break;
						}

						vert.z++;

						newMap[i] = vertices.length-1;
					});

					verticesMap = newMap;

					// remap the faces
					for (var i=0; i<group.length; i++)
					{
						var faceIndex = group[i];
						var face = [
							verticesMap[geom.faces[faceIndex].a],
							verticesMap[geom.faces[faceIndex].b],
							verticesMap[geom.faces[faceIndex].c]
						];
						faces.push(face);
					}

					// calculate UVs for each face depending on normals
					for (var i=0; i<faces.length; i++)
					{
						var face = faces[i];
						var uv = [];

						// calculate normal
						var vA = vertices[ face[0] ];
						var vB = vertices[ face[1] ];
						var vC = vertices[ face[2] ];
						var cb = new THREE.Vector3();
						var ab = new THREE.Vector3();
						cb.sub( vC, vB );
						ab.sub( vA, vB );
						cb.crossSelf( ab );
						cb.normalize();
						var normal = new THREE.Vector3().copy(cb);

						// top
						if (normal.y >= 0.5)
							for (var k=0; k<3; k++)
							{
								var vert = [
									vertices[ face[k] ].x,
									vertices[ face[k] ].z
								];

								uv.push(vert);
							}

						// bottom
						if (normal.y <= -0.5)
							for (var k=0; k<3; k++)
							{
								var vert = [
									1-vertices[ face[k] ].x,
									vertices[ face[k] ].z
								];

								uv.push(vert);
							}

						// left
						if (normal.x <= -0.5)
							for (var k=0; k<3; k++)
								uv.push([
									vertices[ face[k] ].z,
									1 - vertices[ face[k] ].y ]);

						// right
						if (normal.x >= 0.5)
							for (var k=0; k<3; k++)
								uv.push([
									1-vertices[ face[k] ].z,
									1 - vertices[ face[k] ].y ]);

						// front
						if (normal.z <= -0.5)
							for (var k=0; k<3; k++)
								uv.push([
									1-vertices[ face[k] ].x,
									1 - vertices[ face[k] ].y ]);

						// back
						if (normal.z >= 0.5)
							for (var k=0; k<3; k++)
								uv.push([
									vertices[ face[k] ].x,
									1 - vertices[ face[k] ].y ]);

						// create final tile triangle
						var tri = new TileTriangle(face, normal, uv);
						mesh.triangles.push(tri);
					}

					mesh.vertices = vertices;
					mesh.textures = [0,0,0,0,0,0];
					mesh.assignFaces();

					console.log("Mesh corners: ", mesh.nodes);

					// create occlusion maps for each face
					var sides = [[], [], [], [], [], []];

					for (var i=0; i<mesh.triangles.length; i++)
					{
						var face = mesh.triangles[i];
						var v = [
							mesh.vertices[face.vertices[0]],
							mesh.vertices[face.vertices[1]],
							mesh.vertices[face.vertices[2]]
						];

						// map out all faces to appropriate sides
						if (v[0].x == 0 && v[1].x == 0 && v[2].x == 0) 		sides[TileSide.Left].push(face); else
						if (v[0].x == 1 && v[1].x == 1 && v[2].x == 1) 		sides[TileSide.Right].push(face); else
						if (v[0].y == 0 && v[1].y == 0 && v[2].y == 0) 		sides[TileSide.Bottom].push(face); else
						if (v[0].y == 1 && v[1].y == 1 && v[2].y == 1) 		sides[TileSide.Top].push(face); else
						if (v[0].z == 0 && v[1].z == 0 && v[2].z == 0) 		sides[TileSide.Back].push(face); else
						if (v[0].z == 1 && v[1].z == 1 && v[2].z == 1) 		sides[TileSide.Front].push(face);
					}

					// now for each side create a rasterized picture
					for (var j=0; j<6; j++)
					{
						var coverage = 0;
						var side = "";
						switch (j)
						{
							case 0: side = "Front"; break;
							case 1: side = "Back"; break;
							case 2: side = "Left"; break;
							case 3: side = "Right"; break;
							case 4: side = "Top"; break;
							case 5: side = "Bottom"; break;
						}

						var raster = new Array(this.RasterSize * this.RasterSize);
						for (var i=0; i<raster.length; i++) raster[i] = 0;

						// map all triangles on this side to the raster grid, use texcoords as triangle vertices
						for (var f=0; f<sides[j].length; f++)
						{
							var face = sides[j][f];
							this.rasterizeTriangle(face.uvs, this.RasterSize, raster);
						}

						// print out the face shape
						var s = "";
						for (var i=0; i<raster.length; i++)
						{
							s += (((i%16)==0) ? "\n" : "") + (raster[i] ? "#" : "-");
							coverage += raster[i] ? 1 : 0;
						}

						// for top and bottom faces we check the coverage to determine if the tile should cast shadow
						if (j == TileSide.Top || j == TileSide.Bottom)
						{
							if (coverage / raster.length > 0.75) mesh.castShadow = true;
						}

						if (rot == 0)
						{
							console.log("Tile "+g+", rotation "+rot+", SIDE: "+side, sides[j].length);
							console.log(s)
						}

						raster = raster.join("");

						// find index for the face type (add new face type if not found)
						var found = false;
						for (var i=0; i<faceTypes.length; i++)
						{
							if (faceTypes[i] == raster)
							{
								mesh.faces[j].type = i;
								console.log("Face %s uses type %d", side, i);
								found = true;
								break;
							}
						}

						if (!found)
						{
							console.log("Adding new face type "+faceTypes.length);
							mesh.faces[j].type = faceTypes.length;
							faceTypes.push(raster);
						}
					}
				}

				// add this tile
				this.meshes.push(tileMeshes);
			}

			//console.log(faceTypes);		// TODO

			// for each registered face type perform clipping
			for (var i=0; i<faceTypes.length; i++)
			{
				this.clipHorizontal.push(0);
				this.clipVertical.push(0);

				for (var j=0; j<faceTypes.length; j++)
				{
					var horizDifferent = false;
					var vertDifferent = false;

					// check ratser pixels
					for (var x=0; x<this.RasterSize; x++)
					{
						if (horizDifferent && vertDifferent) break;
						for (var y=0; y<this.RasterSize; y++)
						{
							// horizontal checking - x is flipped
							if (faceTypes[i][y*this.RasterSize+x] == "0" && faceTypes[j][y*this.RasterSize+(this.RasterSize-x-1)] == "1") horizDifferent = true;

							// vertical checking - y is flipped
							if (faceTypes[i][y*this.RasterSize+x] == "0" && faceTypes[j][(this.RasterSize-y-1)*this.RasterSize+x] == "1") vertDifferent = true;
							if (horizDifferent && vertDifferent) break;
						}
					}

					// if there was no difference (main type covers this one) add as clipped
					if (!horizDifferent) this.clipHorizontal[i] |= (1<<j);
					if (!vertDifferent) this.clipVertical[i] |= (1<<j);

					//if (!horizDifferent) console.log("Face type %d clips type %d horizontally", i, j);
					//if (!vertDifferent) console.log("Face type %d clips type %d vertically", i, j);
				}
			}


			// Replace tile types list block ids with meshes
			for (var i=0; i<TileTypes.length; i++)
			{
				var t = TileTypes[i];
				t.index = i;
				t.meshes = this.meshes[t.meshes];
				t.collisionMeshes = this.meshes[t.collisionMeshes];

				// create Three.js mesh for every tile
				var geom = new THREE.Geometry();

				for (var j=0; j< t.meshes[0].vertices.length; j++)
				{
					geom.vertices.push(
						new THREE.Vector3().sub(t.meshes[0].vertices[j], new THREE.Vector3(0.5, 0.5, 0.5))
					);
				}

				for (var j=0; j< t.meshes[0].triangles.length; j++)
				{
					var tri = t.meshes[0].triangles[j];
					var face = new THREE.Face3(
						tri.vertices[0],
						tri.vertices[1],
						tri.vertices[2]
					);
					geom.faces.push(face);

					var tileIndex = 0;
					if (tri.normal.x < -0.5) tileIndex = t.textures[TileSide.Left];
					if (tri.normal.x >  0.5) tileIndex = t.textures[TileSide.Right];
					if (tri.normal.z < -0.5) tileIndex = t.textures[TileSide.Front];
					if (tri.normal.z >  0.5) tileIndex = t.textures[TileSide.Back];
					if (tri.normal.y <= -0.5) tileIndex = t.textures[TileSide.Bottom];
					if (tri.normal.y >=  0.5) tileIndex = t.textures[TileSide.Top];

					var uvs = [
						Tile.getTileUV( tileIndex, tri.uvs[0][0], tri.uvs[0][1]),
						Tile.getTileUV( tileIndex, tri.uvs[1][0], tri.uvs[1][1]),
						Tile.getTileUV( tileIndex, tri.uvs[2][0], tri.uvs[2][1])
					];

					geom.faceVertexUvs[0].push(uvs);
				}
				t.mesh = new THREE.Mesh(geom, TileMap.material);

				// also copy castShadow property
				t.castShadow = t.meshes[0].castShadow;
			}

			callback && callback();
		}.bind(this));

		this.loader.load(filename);
	},

	rasterizeTriangle: function(v, size, grid)
	{
		// go through all pixels in the grid and check if they are contained within the triangle
		for (var y=0; y<size; y++)
		for (var x=0; x<size; x++)
		{
			var px = (x + 0.5) / size;
			var py = (y + 0.5) / size;

			var inside = Utils.isPointInsideTriangle(new THREE.Vector2(px, py), v[0], v[1], v[2]);
			if (inside) grid[y * size + x] = 1;
		}
	}
}

var TileMap =
{
	sizeX: 0,
	sizeY: 0,
	sizeZ: 0,
	chunksX: 0,
	chunksY: 0,
	chunksZ: 0,

	dirtyCount: 0,

	tiles: [],
	chunks: [],
	material: null,
	texture: null,
	newBlockMaterial: null,
	highlightMaterial: null,

	selectionMesh: null,
	newBlockMesh: null,
	targetBall: null,

	temp: [],

	init: function(x, y, z, dontGenerate)
	{
		this.sizeX = x;
		this.sizeY = y;
		this.sizeZ = z;

		this.chunksX = Math.ceil(x / TileMapChunk.Size);
		this.chunksY = Math.ceil(y / TileMapChunk.Size);
		this.chunksZ = Math.ceil(z / TileMapChunk.Size);

		// material
		this.texture = THREE.ImageUtils.loadTexture('img/terrain.png');
		this.texture.minFilter = this.texture.magFilter = THREE.NearestFilter;

		this.material = new THREE.MeshLambertMaterial({ map: this.texture, shading: THREE.SmoothShading, vertexColors: THREE.VertexColors, transparent: true });
		this.newBlockMaterial = new THREE.MeshLambertMaterial({ opacity: 0.25, map: this.texture, shading: THREE.SmoothShading, vertexColors: THREE.VertexColors, transparent: true });
		this.highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, shading: THREE.FlatShading, transparent: true, opacity: 0.25 });

		// assign material to all tile types
		for (var i=0; i<TileTypes.length; i++)
			TileTypes[i].mesh = THREE.SceneUtils.createMultiMaterialObject(TileTypes[i].mesh.geometry, [
				this.newBlockMaterial,
				this.highlightMaterial
			]);

		// selection mesh
		this.selectionMesh = THREE.SceneUtils.createMultiMaterialObject(new THREE.CubeGeometry(1.01,1.01,1.01), [
			//new THREE.MeshLambertMaterial({ color: 0xffffff, opacity: 0.25, shading: THREE.FlatShading, transparent: true }),
			new THREE.MeshBasicMaterial({ color: 0xffffff, shading: THREE.FlatShading, wireframe: true, transparent: true, opacity: 0.5 })
		]);
		Engine.scene.add(this.selectionMesh);

		// create temp blocks
		for (var i=0; i<16; i++)
		{
			this.temp.push(THREE.SceneUtils.createMultiMaterialObject(new THREE.CubeGeometry(1.01,1.01,1.01), [
				new THREE.MeshLambertMaterial({ color: 0xffffff, opacity: 0.25, shading: THREE.FlatShading, transparent: true }),
				new THREE.MeshBasicMaterial({ color: 0xffffff, shading: THREE.FlatShading, wireframe: true, transparent: true })
			]));
			Engine.scene.add(this.temp[i]);
		}

		// new block mesh
		this.newBlockMesh = TileTypes[1].mesh;
		Engine.scene.add(this.newBlockMesh);

		this.hideNewBlockMesh();
		this.hideSelectionTile();

		// target ball TODO: temp
		this.targetBall = new THREE.Mesh( new THREE.SphereGeometry(0.1), new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
		Engine.scene.add(this.targetBall);

		// create tiles
		this.tiles = new Array(this.sizeX * this.sizeY * this.sizeZ);
		for (var i=0; i<this.tiles.length; i++)
		{
			this.tiles[i] = new Tile(0);
		}

		// TODO: temp
		for (var i=1; i<10; i++)
		{
			this.getTile(i*2,0,0).type = i;
			this.getTile(i*2,0,1).type = i;
			this.getTile(i*2,0,1).rotation = 1;
			this.getTile(i*2,0,2).type = i;
			this.getTile(i*2,0,2).rotation = 2;
			this.getTile(i*2,0,3).type = i;
			this.getTile(i*2,0,3).rotation = 3;
		}

		// create chunks
		this.chunks = new Array(this.chunksX * this.chunksY * this.chunksZ);
		for (var x=0; x<this.chunksX; x++)
		for (var y=0; y<this.chunksY; y++)
		for (var z=0; z<this.chunksZ; z++)
		{
			this.chunks[y*this.chunksX*this.chunksZ + z*this.chunksX + x] = new TileMapChunk(x,y,z);
		}

		// generate random
		if (!dontGenerate) this.generate();
	},

	generate: function()
	{
		var noise = new SimplexNoise();
		var div = 20;

		for (var x=0; x<this.sizeX; x++)
		for (var y=0; y<this.sizeY; y++)
		for (var z=0; z<this.sizeZ; z++)
		{
			var tile = this.getTile(x, y, z);
			tile.type = noise.noise3d(x/div, y/10, z/div) > 0.25 ? 1 : 0;
			//tile.type = Math.random() > 0.85 ? (5+Math.random() * 10)|0 : 0;//noise.noise3d(x/div, y/10, z/div) > 0.25 ? 1 : 0;
			tile.rotation = (Math.random() * 4)|0;
		}

		// dirt pass
		for (var x=0; x<this.sizeX; x++)
		for (var y=0; y<this.sizeY; y++)
		for (var z=0; z<this.sizeZ; z++)
		{
			var tile = this.getTile(x, y, z);
			if (tile.type == 1 && this.getTileType(x, y+1, z))
				tile.type = 3;

			if (this.getTileType(x, y+1, z) &&
				this.getTileType(x, y+2, z) &&
				this.getTileType(x, y+3, z) &&
				this.getTileType(x, y+4, z) &&
				this.getTileType(x, y+5, z))
				tile.type = 7;
		}

		this.recreate();
	},

	showNewBlockMesh: function(x, y, z)
	{
		this.newBlockMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
		this.newBlockMesh.traverse(function ( object ) { object.visible = true; });
	},

	hideNewBlockMesh: function()
	{
		this.newBlockMesh.traverse(function ( object ) { object.visible = false; });
	},

	showSelectionTile: function(x, y, z)
	{
		this.selectionMesh.position.set(x + 0.5025, y + 0.5025, z + 0.5025);
		this.selectionMesh.traverse(function ( object ) { object.visible = true; });
	},

	hideSelectionTile: function()
	{
		this.selectionMesh.traverse(function ( object ) { object.visible = false; });
	},

	getTile: function(x,y,z)
	{
		if (x<0 || y<0 || z<0 || x>=this.sizeX || y>=this.sizeY || z>=this.sizeZ) return null;
		return this.tiles[y*this.sizeX*this.sizeZ + z*this.sizeX + x];
	},

	getTileType: function(x,y,z)
	{
		if (x<0 || y<0 || z<0 || x>=this.sizeX || y>=this.sizeY || z>=this.sizeZ) return 0;
		return this.tiles[y*this.sizeX*this.sizeZ + z*this.sizeX + x].type;
	},

	getChunk: function(x,y,z)
	{
		if (x<0 || y<0 || z<0 || x>=this.chunksX || y>=this.chunksY || z>=this.chunksZ) return null;
		return this.chunks[y*this.chunksX*this.chunksZ + z*this.chunksX + x];
	},

	recreate: function()
	{
		this.updateLighting();
		for (var i=0; i<this.chunksX * this.chunksY * this.chunksZ; i++)
			this.chunks[i].dirty = true;
	},

	update: function()
	{
		this.dirtyCount = 0;
		for (var i=0; i<this.chunksX * this.chunksY * this.chunksZ; i++)
			if (this.chunks[i].dirty)
			{
				this.dirtyCount++;
				this.chunks[i].recreate();
			}

		if (this.dirtyCount)
			console.log("Recreated %d chunks", this.dirtyCount);

		this.newBlockMaterial.opacity = 0.65 + (Math.sin(Engine.realtime*4) / 2 + 0.5) * 0.25;
	},

	updateLighting: function()
	{
		for (var x=0; x<this.sizeX; x++)
		for (var z=0; z<this.sizeZ; z++)
		{
			var blocked = false;
			for (var y=this.sizeY-1; y>=0; y--)
			{
				var tile = this.getTile(x, y, z);

				tile.brightness = blocked ? 0 : 1;

				if (!blocked && TileTypes[tile.type].castShadow) blocked = true;
			}
		}
	},

	updateTile: function(x, y, z)
	{
		var cx = (x/TileMapChunk.Size)|0;
		var cy = (y/TileMapChunk.Size)|0;
		var cz = (z/TileMapChunk.Size)|0;
		var chunk = this.getChunk(cx,cy,cz);
		if (!chunk) return;

		chunk.dirty = true;

		// also check if neighbouring chunks need to be recreated
		if ((x % TileMapChunk.Size) == TileMapChunk.Size-1)
		{
			this.updateLightingInColumn(x+1, z);
			if (chunk = this.getChunk(cx+1, cy, cz)) chunk.dirty = true;
		}

		if ((x % TileMapChunk.Size) == 0)
		{
			this.updateLightingInColumn(x-1, z);
			if (chunk = this.getChunk(cx-1, cy, cz)) chunk.dirty = true;
		}

		if ((y % TileMapChunk.Size) == TileMapChunk.Size-1)
			if (chunk = this.getChunk(cx, cy+1, cz)) chunk.dirty = true;

		if ((y % TileMapChunk.Size) == 0)
			if (chunk = this.getChunk(cx, cy-1, cz)) chunk.dirty = true;

		if ((z % TileMapChunk.Size) == TileMapChunk.Size-1)
		{
			this.updateLightingInColumn(x, z+1);
			if (chunk = this.getChunk(cx, cy, cz+1)) chunk.dirty = true;
		}

		if ((z % TileMapChunk.Size) == 0)
		{
			this.updateLightingInColumn(x, z-1);
			if (chunk = this.getChunk(cx, cy, cz-1)) chunk.dirty = true;
		}

		// check if we changed the lighting
		this.updateLightingInColumn(x, z);
	},

	getChunkForTile: function(x, y, z)
	{
		if (x<0 || y<0 || z<0 || x>=this.sizeX || y>=this.sizeY || z>=this.sizeZ) return null;
		return this.getChunk((x / TileMapChunk.Size)|0, (y / TileMapChunk.Size)|0, (z / TileMapChunk.Size)|0);
	},

	updateLightingInColumn: function(x, z)
	{
		var blocked = false;
		for (var y=this.sizeY-1; y>=0; y--)
		{
			var chunk = this.getChunkForTile(x, y, z);
			var tile = this.getTile(x, y, z);
			if (!tile) return;

			var oldBrightness = tile.brightness;

			tile.brightness = blocked ? 0 : 1;

			if (!blocked && TileTypes[tile.type].castShadow > 0) blocked = true;

			if (oldBrightness != tile.brightness)
				chunk.dirty = true;
		}
	},

	castRaySides: function(start, end)
	{
		// get list of all tiles along the ray
		var tiles = Utils.traverseGrid3D(start.x, start.y, start.z, end.x, end.y, end.z);
		var ret =
		{
			hit: false,
			tilePos: null,
			tile: null,
			side: -1
		};

		var diff = new THREE.Vector3().sub(end, start);
		var found = false, minD = 99999, d = minD;

		var faces = [
			[	// Front
				new THREE.Vector3(0,1,1), new THREE.Vector3(1,1,1), new THREE.Vector3(1,0,1),
				new THREE.Vector3(0,1,1), new THREE.Vector3(1,0,1), new THREE.Vector3(0,0,1)
			],
			[	// Back
				new THREE.Vector3(1,1,0), new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0),
				new THREE.Vector3(1,1,0), new THREE.Vector3(0,0,0), new THREE.Vector3(1,0,0)
			],
			[	// Left
				new THREE.Vector3(0,1,0), new THREE.Vector3(0,1,1), new THREE.Vector3(0,0,1),
				new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0)
			],
			[	// Right
				new THREE.Vector3(1,1,1), new THREE.Vector3(1,1,0), new THREE.Vector3(1,0,0),
				new THREE.Vector3(1,1,1), new THREE.Vector3(1,0,0), new THREE.Vector3(1,0,1)
			],
			[	// Top
				new THREE.Vector3(0,1,0), new THREE.Vector3(1,1,0), new THREE.Vector3(1,1,1),
				new THREE.Vector3(0,1,0), new THREE.Vector3(1,1,1), new THREE.Vector3(0,1,1)
			],
			[	// Bottom
				new THREE.Vector3(0,0,1), new THREE.Vector3(1,0,1), new THREE.Vector3(1,0,0),
				new THREE.Vector3(0,0,1), new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0)
			]
		];

		// check the tiles along the ray and find the one we are pointing at
		for (var i=0; i<tiles.length; i++)
		{
			var pos = tiles[i];
			var tile = this.getTile(pos.x, pos.y, pos.z);

			// if no tile at this location, we reached the end of the map
			if (!tile || tile.type == 0) continue;

			// check each of the 6 faces
			for (var t=0; t<6; t++)
			{
				var result = {}; //console.log(tri, start, end)
				if (Collision.lineTriangle(
					new THREE.Vector3().add(faces[t][0], pos),
					new THREE.Vector3().add(faces[t][1], pos),
					new THREE.Vector3().add(faces[t][2], pos),
					start, end, result)					)
				{
					var d = result.fraction;
					if (d < minD)
					{
						minD = d;
						ret.hit = true;
						ret.tilePos = pos.clone();
						ret.tile = tile;
						found = true;

						ret.side = t;
					}
				}
				else if (Collision.lineTriangle(
					new THREE.Vector3().add(faces[t][3], pos),
					new THREE.Vector3().add(faces[t][4], pos),
					new THREE.Vector3().add(faces[t][5], pos),
					start, end, result))
				{
					var d = result.fraction;
					if (d < minD)
					{
						minD = d;
						ret.hit = true;
						ret.tilePos = pos.clone();
						ret.tile = tile;
						found = true;

						ret.side = t;
					}
				}
			}

			if (found) return ret;
		}
		return ret;
	},

	castRay: function(start, end, precise)
	{
		// get list of all tiles along the ray
		var tiles = Utils.traverseGrid3D(start.x, start.y, start.z, end.x, end.y, end.z);
		var ret =
		{
			hit: false,
			tilePos: null,
			tile: null,
			position: null
		};

		var diff = new THREE.Vector3().sub(end, start);
		var found = false, minD = 99999, d = minD;

		// check the tiles along the ray and find the one we are pointing at
		for (var i=0; i<tiles.length; i++)
		{
			var pos = tiles[i];
			var tile = this.getTile(pos.x, pos.y, pos.z);

			// if no tile at this location, we reached the end of the map
			if (!tile || tile.type == 0) continue;

			// get the list of triangles and check if we hit any of them
			var tris = tile.getCollideTriangles(pos.x, pos.y, pos.z);

			for (var t=0; t<tris.length; t++)
			{
				var tri = tris[t];
				var result = {}; //console.log(tri, start, end)
				if (Collision.lineTriangle(tri[0], tri[1], tri[2], start, end, result))
				{
					var d = result.fraction;
					if (d < minD)
					{
						minD = d;
						ret.hit = true;
						ret.tilePos = pos.clone();
						ret.tile = tile;
						found = true;

						if (!precise) return ret;

						ret.position = new THREE.Vector3().add(start, new THREE.Vector3().copy(diff).multiplyScalar(d));
					}
				}
			}

			// if we found closest colliding triangle in this tile, return
			if (found) return ret;
		}

		return ret;
	},

	getTilesAlongVector: function(start, end, bbox)
	{
		var sx = (start.x - bbox.x/2)|0, ex = 1+(end.x + bbox.x/2)|0;
		var sy = (start.y - bbox.y/2)|0, ey = 1+(end.y + bbox.y/2)|0;
		var sz = (start.z - bbox.z/2)|0, ez = 1+(end.z + bbox.z/2)|0;

		sx = Math.max(Math.min(this.sizeX-1, sx), 0);
		sy = Math.max(Math.min(this.sizeY-1, sy), 0);
		sz = Math.max(Math.min(this.sizeZ-1, sz), 0);

		ex = Math.max(Math.min(this.sizeX-1, ex), 0);
		ey = Math.max(Math.min(this.sizeY-1, ey), 0);
		ez = Math.max(Math.min(this.sizeZ-1, ez), 0);

		var ret = [];

		for (var x=sx; x<=ex; x++)
			for (var y=sy; y<=ey; y++)
				for (var z=sz; z<=ez; z++)
					ret.push(this.getTile(x,y,z));

		return ret;
	},

	isTileWithinArea: function(origin, bbox, pos)
	{
		var sx = (origin.x - bbox.x/2)|0, ex = (origin.x + bbox.x/2)|0;
		var sy = (origin.y - bbox.y/2)|0, ey = (origin.y + bbox.y/2)|0;
		var sz = (origin.z - bbox.z/2)|0, ez = (origin.z + bbox.z/2)|0;

		sx = Math.max(Math.min(this.sizeX-1, sx), 0);
		sy = Math.max(Math.min(this.sizeY-1, sy), 0);
		sz = Math.max(Math.min(this.sizeZ-1, sz), 0);

		ex = Math.max(Math.min(this.sizeX-1, ex), 0);
		ey = Math.max(Math.min(this.sizeY-1, ey), 0);
		ez = Math.max(Math.min(this.sizeZ-1, ez), 0);

		return sx <= pos.x && sy <= pos.y && sz <= pos.z && ex >= pos.x && ey >= pos.y && ez >= pos.z;
	},

	getTileTrianglesAlongVector: function(start, end, bbox)
	{
		var sx = start.x, ex = end.x;
		var sy = start.y, ey = end.y;
		var sz = start.z, ez = end.z;
		var s;
		if (ex < sx) { s = sx; sx = ex; ex = s; }
		if (ey < sy) { s = sy; sy = ey; ey = s; }
		if (ez < sz) { s = sz; sz = ez; ez = s; }

		sx = Math.floor(sx - bbox.x/2); ex = Math.floor(ex + bbox.x/2)|0;
		sy = Math.floor(sy - bbox.y/2); ey = Math.floor(ey + bbox.y/2)|0;
		sz = Math.floor(sz - bbox.z/2); ez = Math.floor(ez + bbox.z/2)|0;

		var ret = [];
		var j=0;

		for (var x=sx; x<=ex; x++)
			for (var y=sy; y<=ey; y++)
				for (var z=sz; z<=ez; z++)
				{
					var t = this.getTile(x,y,z);
					if (!t || t.type == 0) continue;

					var tris = t.getCollideTriangles(x, y, z);
					for (var i=0; i<tris.length; i++)
						ret.push(tris[i]);
				}

		return ret;
	},

	saveToString: function()
	{
		// size of the level (max 255)
		var s = [
			String.fromCharCode(this.sizeX),
			String.fromCharCode(this.sizeY),
			String.fromCharCode(this.sizeZ)
		].join("");

		for (var i=0; i<this.tiles.length; i++)
		{
			s += String.fromCharCode(this.tiles[i].type);
			s += String.fromCharCode(this.tiles[i].rotation);
		}

		return s;
	},

	loadFromString: function(s)
	{
		this.init(s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), true);

		for (var i=0; i<this.tiles.length; i++)
		{
			this.tiles[i].type = s.charCodeAt(3+i*2+0);
			this.tiles[i].rotation = s.charCodeAt(3+i*2+1);
		}

		this.recreate();
	}

}
