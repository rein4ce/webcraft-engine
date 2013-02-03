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

var EditMode =
{
	None:		0,			// no edit mode
	Delete:		1,			// delete tiles
	Create:		2			// create tiles
}

var Engine =
{
	Fov: 		90,
	Near: 		0.1,
	Far: 		4096,

	// Application
	width: 			0,
	height: 		0,
	aspect: 		0,
	container:		null,
	deltaX: 		0,
	deltaY:			0,
	mouseX:			0,
	mouseY: 		0,
	realtime:		Date.now() / 1000,
	oldRealtime:	Date.now() / 1000,
	frametime:		0,
	fps:			0,
	dragging:		false,
	dragStartX:		0,
	dragStartY:		0,
	lon:			0,
	onMouseDownLon:	0,
	lat:			0,
	onMouseDownLat:	0,
	phi:			0,
	theta:			0,
	dragSpeed:		0.4,

	// Three.js objects
	camera: 		null,
	scene: 			null,
	renderer: 		null,
	ambient: 		null,
	dirLight:		null,
	composer:		null,
	target:			null,

	// Scene
	cube:			null,

	// UI
	crosshair:		null,

	// Editor
	editMode:		EditMode.Create,								// are we editing?
	currentTile:	1,												// currently selected build tile
	tileRotation:	0,												// build tile rotation
	pickRadius:		5,												// how far we are picking tiles
	saveName:		null,

	// Player
	bboxSize:		new THREE.Vector3(0.55, 1.7, 0.55),				// size of the player bbox
	eyesOffset:		new THREE.Vector3(0, 0.4, 0),					// offset of the eyes relative to the center of bbox
	bboxSizeHalf:	null,
	bbox:			null,
	bboxAxis:		 [
		new THREE.Vector3(1,0,0),									// default orientation of AABB bbox
		new THREE.Vector3(0,1,0),
		new THREE.Vector3(0,0,1)
	],
	fly:			false,											// are we flying?
	moveVector:		new THREE.Vector3(0,0,0),
	velocity:		new THREE.Vector3(0,0,0),
	moveSpeed:		3,												// normal movement speed
	runSpeed:		6,												// speed with RUN key on
	gravity:		14,												// gravity acceleration
	acceleration:	new THREE.Vector3(0,0,0),
	onGround:		false,
	groundCheckVector:	new THREE.Vector3(0,-0.05,0),
	jumpCheckVector:	new THREE.Vector3(0,+0.05,0),
	jumpForce:		6,												// jump velocity
	inJump:			false,

	/**
	 * Initialize the engine, set up Three.js objects like scene, camera, lights, renderers
	 */
	init: function()
	{
		var content = $("#content");
		this.container = $("<div/>");
		content.append(this.container);

		this.crosshair = $("#crosshair");

		this.width = content.width();
		this.height = content.height();
		this.aspect = this.width / this.height;

		console.log("Screen size: ", this.width, this.height);

		// create scene
		this.scene = new THREE.Scene();

		// create camera
		this.camera = new THREE.PerspectiveCamera(this.Fov, this.aspect, this.Near, this.Far);
		this.camera.position.x = 50;
		this.scene.add(this.camera);

		// create player bbox
		this.bbox = new THREE.Mesh(new THREE.CubeGeometry(this.bboxSize.x, this.bboxSize.y, this.bboxSize.z), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, doubleSided: true, wireframe: true }));
		this.bboxSizeHalf = this.bboxSize.clone().multiplyScalar(0.5);
		//this.scene.add(this.bbox);

		// camera target
		this.camera.target = this.target = new THREE.Vector3(0,0,0);

		// set up lights
		this.ambient = new THREE.AmbientLight(0xFFFFFF);
		this.scene.add(this.ambient);

		this.dirLight = new THREE.DirectionalLight(0xFFEEDD);
		this.dirLight.position.set(0.8,-1,0.5).normalize();
		this.scene.add(this.dirLight);

		// create renderer
		this.renderer = new THREE.WebGLRenderer({ clearColor: 0xFF0000, antialias: false });
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColorHex ( 0xDDEEFF, 1 );
		this.container.append(this.renderer.domElement);

		// create composer
		var rtParams =
		{
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false
		};
		var renderPass = new THREE.RenderPass(this.scene, this.camera);
		var screenPass = new THREE.ShaderPass(THREE.CopyShader);
		screenPass.renderToScreen = true;

		this.composer = new THREE.EffectComposer(this.renderer, new THREE.WebGLRenderTarget(this.width, this.height, rtParams));
		this.composer.addPass(renderPass);
		this.composer.addPass(screenPass);

		// initialize the rest
		this.initUI();
		this.initEvents();
		this.initScene();
	},

	/**
	 * Initialize UI elements (if any)
	 */
	initUI: function()
	{
		var list = $("#tilelist");
		for (var i=0; i<TileTypes.length; i++)
		{
			list.append("<li>"+TileTypes[i].name+"</li>");
		}
	},

	/**
	 * Initialize all events, like mouse movement, and register key actions
	 */
	initEvents: function()
	{
		Input.initKeyboard();
		Input.initMouse();

		this.container.bind("mousemove", function(e)
		{
			if(!e.offsetX)
			{
				e.offsetX = (e.pageX - $(e.target).offset().left);
				e.offsetY = (e.pageY - $(e.target).offset().top);
			}

			this.deltaX = e.offsetX - this.mouseX;
			this.deltaY = e.offsetY - this.mouseY;
			this.mouseX = e.offsetX;
			this.mouseY = e.offsetY;

			if (document.pointerLockEnabled)
			{
				this.lon -= e.originalEvent.movementX * this.dragSpeed;
				this.lat -= e.originalEvent.movementY * this.dragSpeed;
			}
			else
			{
				if (this.dragging)
				{
					this.lon = (this.dragStartX - this.mouseX) * this.dragSpeed * 2 + this.onMouseDownLon;
					this.lat = (this.dragStartY - this.mouseY) * this.dragSpeed * 2 + this.onMouseDownLat;
				}
			}
		}.bind(this));

		this.container.bind("mousedown", function(e)
		{
			if(!e.offsetX)
			{
				e.offsetX = (e.pageX - $(e.target).offset().left);
				e.offsetY = (e.pageY - $(e.target).offset().top);
			}

			this.dragStartX = e.offsetX;
			this.dragStartY = e.offsetY;
			this.onMouseDownLon = this.lon;
			this.onMouseDownLat = this.lat;
			this.dragging = true;

			try {
				this.container[0].requestPointerLock();
			} catch (e) {
				console.error(e);
			}
		}.bind(this));

		$(document).bind("mouseup", function(e)
		{
			this.dragging = false;
			document.exitPointerLock();
		}.bind(this));

		this.container.bind("mouseout", function(e)
		{
			this.dragging = false;
		}.bind(this));

		this.container.click(function(e)
		{

		}.bind(this));

		// action bindings (used later like Input.pressed(...)
		Input.bind(Keys.W, "forward");
		Input.bind(Keys.S, "backward");
		Input.bind(Keys.A, "moveleft");
		Input.bind(Keys.D, "moveright");
		Input.bind(Keys.SPACE, "jump");
		Input.bind(Keys.CTRL, "movedown");
		Input.bind(Keys.SHIFT, "run");
		Input.bind(Keys.E, "use");
		Input.bind(Keys.Q, "rotate");
		Input.bind(Keys.MWHEEL_UP, "prev");
		Input.bind(Keys.MWHEEL_DOWN, "next");
		Input.bind(Keys.Z, "z");
		Input.bind(Keys.F, "fly");
		Input.bind(Keys._1, "slot1");
		Input.bind(Keys._2, "slot2");
		Input.bind(Keys.F2, "save");
	},

	/**
	 * Initialize our game scene e.g. create a level
	 */
	initScene: function()
	{
		// First let's load our tileset
		Tileset.load("models/tileset.obj", function()
		{
			// if the URL contains a hash, let's try to load a map with it's name from local storage
			var hash = window.location.hash.replace("#", "");
			if (localStorage[hash])
			{
				console.log("Loading map '%s'", hash);
				TileMap.loadFromString(localStorage[hash]);
				this.saveName = hash;
			}
			else
			{
				// create a new map
				TileMap.init(64,32,64);
				this.saveName = null;
				window.location.hash = "";
			}

			// start game loop!
			this.update();

			this.camera.position.set(32, 45, 32);

		}.bind(this));
	},

	/**
	 * Try to save current level into local storage, prompt for the name if not specified already
	 */
	save: function()
	{
		var name = this.saveName;
		if (!this.saveName)
			name = prompt("Name of your level to save locally");

		if (!name) return;

		localStorage[name] = TileMap.saveToString();
		alert("Level saved with name: "+name+"!\nLoad it by adding #"+name+" to the url and reloading the page");
	},

	/**
	 * Main engine update function, called each render frame
	 */
	update: function()
	{
		this.oldRealtime = this.realtime;
		this.realtime = Date.now() / 1000;
		this.frametime = Math.min(0.1, this.realtime - this.oldRealtime);
		this.fps = 1 / this.frametime;

		$("#fps-counter").text(this.fps.toFixed(1) + " FPS");

		this.frame(this.frametime, this.realtime);

		Engine.deltaX = Engine.deltaY = 0;

		requestAnimationFrame(function()
		{
			Engine.update.call(Engine);
		});
		this.render();

		this.moveVector.x = this.moveVector.y = this.moveVector.z = 0;
		Input.clearPressed();
	},

	/**
	 * This is the game frame function. Here we put all game related mechanics
	 * @param frametime				- time of the current frame in seconds
	 * @param realtime
	 */
	frame: function(frametime, realtime)
	{
		this.updateCamera();
		this.updateEditor();

		TileMap.update();
	},

	/**
	 * Perform some level editing interactions like picking tiles and handling actions
	 */
	updateEditor: function()
	{
		var old = this.currentTile;

		// on mouse wheel scroll, go back to building mode immediately (if not already)
		if (Input.pressed("prev"))
		{
			if (this.editMode != EditMode.Create)
				this.editMode = EditMode.Create;
			else
				this.currentTile--;
		}
		if (Input.pressed("next"))
		{
			if (this.editMode != EditMode.Create)
				this.editMode = EditMode.Create;
			else
				this.currentTile++;
		}

		// rotate the tile
		if (Input.pressed("rotate")) { 	console.log(this.tileRotation); this.tileRotation++; }

		// save the level
		if (Input.pressed("save")) this.save();

		if (this.currentTile == 0) this.currentTile = TileTypes.length-1;
		if (this.currentTile == TileTypes.length) this.currentTile = 1;
		if (this.tileRotation == 4) this.tileRotation = 0;

		if (old != this.currentTile)
		{
			this.scene.remove(TileMap.newBlockMesh);
			TileMap.newBlockMesh = TileTypes[this.currentTile].mesh;
			this.scene.add(TileMap.newBlockMesh);
		}

		// edit mode selection
		if (Input.pressed("slot1")) this.editMode = EditMode.Delete;
		if (Input.pressed("slot2")) this.editMode = EditMode.Create;

		TileMap.newBlockMesh.rotation.y =  Math.PI * this.tileRotation * 0.5;

		// update UI
		$("#slot1").toggleClass("active", this.editMode == EditMode.Delete);
		$("#slot2").toggleClass("active", this.editMode == EditMode.Create);

		this.doPicking();
	},

	/**
	 * Handle the camera rotation and movement
	 */
	updateCamera: function()
	{
		// camera rotation
		this.lat = Math.max( - 89, Math.min( 89, this.lat ) );		// x angle
		this.phi = ( 90 - this.lat ) * Math.PI / 180;
		this.theta = this.lon * Math.PI / 180;						// y angle

		this.camera.eulerOrder = "YXZ";

		this.camera.rotation.y = this.theta + Math.PI / 2;
		this.camera.rotation.x = this.lat * Math.PI / 180;

		if (Input.state("forward")) this.moveVector.z = -1;
		if (Input.state("backward")) this.moveVector.z = 1;
		if (Input.state("moveleft")) this.moveVector.x = -1;
		if (Input.state("moveright")) this.moveVector.x = 1;
		if (Input.state("moveup")) this.moveVector.y = 1;
		if (Input.state("movedown")) this.moveVector.y = -1;

		var speed = Input.state("run") ? this.moveSpeed * 5 : this.moveSpeed;

		var start = this.camera.position.clone();

		this.camera.updateMatrixWorld(true);
		this.camera.target = this.camera.localToWorld(new THREE.Vector3(0,0,-1)).subSelf(this.camera.position);

		this.camera.translateX(this.moveVector.x * speed * this.frametime);
		this.camera.translateY(this.moveVector.y * speed * this.frametime);
		this.camera.translateZ(this.moveVector.z * speed * this.frametime);

		var end = this.camera.position.clone();

		// perform movement
		this.move(start, end);

		// update position of our bbox
		this.bbox.position.copy(this.camera.position.clone().subSelf(this.eyesOffset));
	},

	/**
	 * Move our player through the level
	 * @param start
	 * @param end
	 */
	move: function(start, end)
	{
		start.subSelf(this.eyesOffset);
		end.subSelf(this.eyesOffset);
		var disp = end.clone().subSelf(start);

		// Toggle movement
		if (Input.pressed("fly"))
			this.fly = !this.fly;

		// Fly movement
		if (this.fly)
		{
			this.velocity.set(0,0,0);
			this.acceleration.set(0,0,0);
			this.onGround = false;
			this.inJump = false;

			if (disp.length() > 0)
			{
				var trace = Movement.slideMove(start, this.bboxSizeHalf, this.bboxAxis, disp);

				this.camera.position.copy(trace.newStart.addSelf(this.eyesOffset));
			}
		}
		// Walk movement
		else
		{
			var trace;

			// if we are moving upwards, don't check for ground
			if (this.velocity.y > 0 || this.inJump)
			{
				this.onGround = false;

				// check if we hit something above us
				trace = Movement.singleMove(start, this.bboxSizeHalf, this.bboxAxis, this.jumpCheckVector);
				if (trace.collision && this.velocity.y > 0) this.velocity.y = 0;
			}
			else
			{
				// check if we're on the ground
				trace = Movement.singleMove(start, this.bboxSizeHalf, this.bboxAxis, this.groundCheckVector);
				this.onGround = trace.collision;
			}

			if (this.velocity.y <= 0) this.inJump = false;

			// add gravity
			this.acceleration.y = -this.gravity;
			this.velocity.addSelf(this.acceleration.clone().multiplyScalar(this.frametime));

			// if we are standing on the ground, we don't move downwards anymore
			if (this.onGround)
			{
				//console.log("on ground")
				if (this.velocity.y < 0) this.velocity.y = 0;

				if (Input.pressed("jump"))
				{
					this.velocity.y = this.jumpForce;
					this.inJump = true;
					this.onGround = false;
				}
			}

			disp = this.velocity.clone().multiplyScalar(this.frametime);

			// running
			var speed = Input.state("run") ? this.runSpeed : this.moveSpeed;

			// forward movement
			disp.x += Math.sin(this.lon / 180 * Math.PI + Math.PI/2) * speed * this.frametime * this.moveVector.z;
			disp.z += Math.cos(this.lon / 180 * Math.PI + Math.PI/2) * speed * this.frametime * this.moveVector.z;

			// side movement
			disp.x -= Math.sin(this.lon / 180 * Math.PI) * speed * this.frametime * this.moveVector.x;
			disp.z -= Math.cos(this.lon / 180 * Math.PI) * speed * this.frametime * this.moveVector.x;

			var trace = Movement.slideMove(start, this.bboxSizeHalf, this.bboxAxis, disp);

			this.camera.position.copy(trace.newStart.addSelf(this.eyesOffset));

			// if we fall below the world, resposition
			if (this.camera.position.y < -20)
			{
				this.camera.position.y = TileMap.sizeY + 5;
				this.velocity.y = 0;
				this.camera.position.x = Math.random() * TileMap.sizeX;
				this.camera.position.z = Math.random() * TileMap.sizeZ;
			}
		}
	},

	/**
	 * Tile picking for the map editing
	 */
	doPicking: function()
	{
		var end = this.camera.target.clone().multiplyScalar(this.pickRadius).addSelf(this.camera.position)

		switch (this.editMode)
		{
			case EditMode.None:
				TileMap.hideSelectionTile();
				TileMap.hideNewBlockMesh();
				break;

			// Pick a side of a tile we are pointing at and neighbouring tile is the desired location
			case EditMode.Create:
				TileMap.hideSelectionTile();
				var trace = TileMap.castRaySides(this.camera.position.clone(), end);
				if (trace.hit)
				{
					switch (trace.side)
					{
						case TileSide.Left: trace.tilePos.x--; break;
						case TileSide.Right: trace.tilePos.x++; break;
						case TileSide.Front: trace.tilePos.z++; break;
						case TileSide.Back: trace.tilePos.z--; break;
						case TileSide.Top: trace.tilePos.y++; break;
						case TileSide.Bottom: trace.tilePos.y--; break;
						default: console.error("Invalid side: ", trace.side)
					}

					var tile = null;
					if (!(tile = TileMap.getTile(trace.tilePos.x, trace.tilePos.y, trace.tilePos.z)))
					{
						TileMap.hideNewBlockMesh();
					}
					else
					{
						// check if the new position is not where we stand right now
						if (TileMap.isTileWithinArea(this.camera.position.clone().subSelf(this.eyesOffset), this.bboxSize, trace.tilePos))
						{
							TileMap.hideNewBlockMesh();
						}
						else
						{
							TileMap.showNewBlockMesh(trace.tilePos.x, trace.tilePos.y, trace.tilePos.z);

							if (Input.pressed("use"))
							{
								tile.type = this.currentTile;
								tile.rotation = this.tileRotation;
								TileMap.updateTile(trace.tilePos.x, trace.tilePos.y, trace.tilePos.z);
							}
						}
					}
				}
				else
				{
					TileMap.hideNewBlockMesh();
				}
				break;

			// Pick a tile we are directly pointing at
			case EditMode.Delete:
				TileMap.hideNewBlockMesh();
				var trace = TileMap.castRay(this.camera.position.clone(), end);
				if (trace.hit)
				{
					TileMap.showSelectionTile(trace.tilePos.x, trace.tilePos.y, trace.tilePos.z);

					if (Input.pressed("use"))
					{
						trace.tile.type = 0;
						TileMap.updateTile(trace.tilePos.x, trace.tilePos.y, trace.tilePos.z);
					}
				}
				else
				{
					TileMap.hideSelectionTile();
				}
		}
	},

	render: function()
	{
		this.renderer.clear();
		this.renderer.render(this.scene, this.camera);
	}
}