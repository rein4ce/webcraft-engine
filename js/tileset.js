// create tile types list
// Parameters:	NAME			MESH	COLLISIONMESH	TEXTURES(F, B, L, R, T, B)
TileTypes =
[
	new TileType("empty", 				0, 0, 	null),
	new TileType("grass", 				1, 1, 	[3,3,3,3,0,2]),
	new TileType("stone", 				3, 3, 	1),
	new TileType("dirt", 				1, 1, 	2),
	new TileType("wood", 				1, 1, 	4),
	new TileType("stone blocks",		1, 1, 	[5,5,5,5,6,6]),
	new TileType("bricks", 				1, 1, 	7),
	new TileType("rock", 				1, 1, 	16),



	new TileType("lowerbrick", 			2, 2, [3,3,3,3,0,3]),
	new TileType("upperbrick", 			3, 3, [3,3,3,3,0,3]),
	new TileType("slope", 				4, 4, [3,3,3,3,0,3]),
	new TileType("cornerslope",			5, 5, [3,3,3,3,0,3]),
	new TileType("stairs", 				6, 4, [3,3,3,3,0,3]),
	new TileType("upperslope", 			7, 7, [3,3,3,3,0,3]),
	new TileType("pole", 				8, 8, [3,3,3,3,0,3]),
	new TileType("lowerslope", 			9, 9, [3,3,3,3,0,3]),
	new TileType("cornerlowerslope", 	10, 10, [3,3,3,3,0,3]),
];