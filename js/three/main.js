function HomeworldDemo()
{
	var container, stats;
	var mouseX = 0;
	var mouseY = 0;
	var camera, scene, renderer;
	var windowHalfX = window.innerWidth / 2;
	var windowHalfY = window.innerHeight / 2;
	var fov = 45;
	var loader, object;
	var models = [];
	var startX, startY;
	var dragX = 0, dragY = 0;
	var speedX = 0, speedY = 0;
	var zoom = 0;
	var largest = 0;
	var dragging = false;
	var composer, finalComposer;
	var hitSphere;
	var castVector = new THREE.Vector3();
	var projector;
	var intersection;
	var trails = null;
	var trailsNew = [];

	function init()
	{
		container = document.createElement("div");
		document.getElementById("content").appendChild(container);

		camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 9000);
		camera.position.z = 500;

		scene = new THREE.Scene();

		// Lights
		var ambient = new THREE.AmbientLight(0xFFEE66);
		scene.add(ambient);

		var directionalLight = new THREE.DirectionalLight(0xFFEEDD);
		directionalLight.position.set(0,0,1).normalize();
		scene.add(directionalLight);

		// Hit sphere
		var mat = new THREE.MeshPhongMaterial( { color: 0xFFFF00, specular: 0x111111, shininess: 50, wireframe: true } );
		var particleMat = new THREE.ParticleCanvasMaterial( {

			color: 0x000000,
			program: function ( context )
			{
				context.beginPath();
				context.arc( 0, 0, 1, 0, Math.PI/2, true );
				context.closePath();
				context.fill();
			}
		});
		//hitSphere = new THREE.Particle(particleMat);
		//hitSphere.scale.x = hitSphere.scale.y = 8;
		hitSphere = new THREE.Mesh(new THREE.SphereGeometry(3), mat);
		//hitSphere.position.set(0,0,100);
		scene.add(hitSphere);

		projector = new THREE.Projector();

		// Model
		loader = new THREE.OBJMTLLoader();
		loader.addEventListener("load", function(event)
		{
			if (object) scene.remove(object);
			scene.remove(trails);
			trailsNew = [];

			object = event.content;
			object.position.set(0,0,0);
			object.rotation.z = Math.PI/2;
			object.rotation.y = Math.PI/5;
			object.rotation.x = Math.PI/7;
			object.updateMatrix();
			console.log(object)
			scene.add(object);

			// draw spheres
			largest = 0;
			for (var i=0; i<object.children.length; i++)
			{
				var mesh = object.children[i];
				//console.log(mesh.material)
				//mesh.material.color.setHex(0xb55b5d);
				largest = Math.max(largest, mesh.boundRadius);
				/*var s = new THREE.Mesh(new THREE.SphereGeometry(mesh.boundRadius), mat);
				s.position.copy = mesh.position;
				spheres.push(s);
				scene.add(s);*/
			}

			// create trails
			var pos = new THREE.Vector3(0,0,100);
			var length = 100;
			var geom = new THREE.PlaneGeometry(1,6,1,1);
			var geom2 = new THREE.PlaneGeometry(1,6,1,1);
			geom.applyMatrix(new THREE.Matrix4(
				0,0,1,0,
				1,0,0,0,
				0,1,0,-3,
				0,0,0,1));
			geom2.applyMatrix(new THREE.Matrix4(
				1,0,0,0,
				0,0,1,0,
				0,1,0,-3,
				0,0,0,1));

			THREE.GeometryUtils.merge(geom, geom2);
			var trailMat = new THREE.MeshBasicMaterial({ opacity: 0.5, color: 0xFFCC99, map: THREE.ImageUtils.loadTexture("img/jet.png"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
			trailMat.side = THREE.DoubleSide;

			trails = new THREE.Object3D();
			trails.ignoreRaycasts = true;

			var t = [];
			t.push(new THREE.Mesh(geom, trailMat));
			t.push(new THREE.Mesh(geom, trailMat));

			t[0].rotation.z = Math.PI/4;

			for (var i=0; i<t.length; i++)
			{
				t[i].scale.x = t[i].scale.y = t[i].scale.z = largest/5;
				t[i].ignoreRaycasts = true;
				trails.add(t[i]);
			}

			//var s = new THREE.Mesh(new THREE.SphereGeometry(3), mat);
			//s.ignoreRaycasts = true;
			//trails.add(s);

			object.add(trails);

			camera.position.z = largest * 2.5;
			zoom = camera.position.z;
		});

		// Renderer
		renderer = new THREE.WebGLRenderer();
		renderer.setSize(window.innerWidth, window.innerHeight);
		container.appendChild(renderer.domElement);

		// Events
		document.addEventListener("mousemove", onMouseMove, false);
		document.addEventListener("resize", onWindowResize, false);
		$(document)
			.bind("keydown", function(e)
			{
				if (e.keyCode == 46)
				{
					for (var i=0; i<trailsNew.length; i++) object.remove(trailsNew[i]);
					trailsNew = [];
				}
			})
			.bind("mousedown", function()
			{
				dragging = true;
				startX = (event.clientX - windowHalfX) / 2;
				startY = (event.clientY - windowHalfY) / 2;


			})
			.bind("mouseup", function()
			{
				dragging = false;
				if (startX == mouseX && startY == mouseY)
				{
					if (intersection)
					{
						console.log("Create trail")
						var t  = createTrail(intersection.point, largest/5, intersection.face.normal);
						trailsNew.push(t);
						object.add(t);
					}
				}
			})
			.bind("mousewheel", function(e)
			{
				var distance = 50 * (e.originalEvent.wheelDelta > 0 ? 1 : -1);
				zoom = Math.max(largest, zoom-distance);
			});

		// Effects
		var rtParams = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, stencilBuffer: false };

		var renderScene = new THREE.RenderPass( scene, camera );
		composer = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, rtParams ) );
		composer.addPass(renderScene);

		var renderScene2 = new THREE.RenderPass( scene, camera );
		renderScene2.needsSwap = false;
		renderScene2.renderToScreen = false;

		var finalPass = new THREE.ShaderPass( THREE.Extras.Shaders.Additive );
		finalPass.needsSwap = true;
		finalPass.uniforms["tAdd"].value = composer.renderTarget2;
		finalPass.renderToScreen = true;
		var effectBloom = new THREE.BloomPass( 0.5, 25, 3 );
		finalComposer = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, rtParams ) );
		finalComposer.addPass(renderScene2);
		finalComposer.addPass(effectBloom);
		finalComposer.addPass(finalPass);


		getFilesList();
		animate();
	}

	function createTrail(pos, size, dir)
	{
		var geom = new THREE.PlaneGeometry(1,6,1,1);
		var geom2 = new THREE.PlaneGeometry(1,6,1,1);
		geom.applyMatrix(new THREE.Matrix4(
			0,0,1,0,
			1,0,0,0,
			0,1,0,-3,
			0,0,0,1));
		geom2.applyMatrix(new THREE.Matrix4(
			1,0,0,0,
			0,0,1,0,
			0,1,0,-3,
			0,0,0,1));

		THREE.GeometryUtils.merge(geom, geom2);
		var trailMat = new THREE.MeshBasicMaterial({ opacity: 0.5, color: 0xFFCC99, map: THREE.ImageUtils.loadTexture("img/jet.png"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
		trailMat.side = THREE.DoubleSide;

		var trail = new THREE.Object3D();
		trail.ignoreRaycasts = true;

		var t = [];
		t.push(new THREE.Mesh(geom, trailMat));
		t.push(new THREE.Mesh(geom, trailMat));

		t[0].rotation.z = Math.PI/4;

		for (var i=0; i<t.length; i++)
		{
			t[i].scale.x = t[i].scale.y = t[i].scale.z = size;
			t[i].ignoreRaycasts = true;
			trail.add(t[i]);
		}

		trail.position.copy(pos);
		trail.lookAt(trail.position.clone().subSelf(dir));
		trail.material = trailMat;
		return trail;
	}

	function getFilesList(callback)
	{
		$.getJSON("/models", function(res)
		{
			if (res.error) return console.error(res.error);

			var list = $("#list").empty();

			$.each(res, function(i, entry)
			{
				var item = $("<li/>").text(entry.name);

				item.click(function()
				{
					loader.load(entry.objPath, entry.mtlPath);
					list.find("li").removeClass("active");
					item.addClass("active");
				});

				list.append(item);
			});

			// load random object
			//var entry = res[];
			//loader.load(entry.objPath, entry.mtlPath);
			var random = (Math.random() * res.length)|0;
			$("#list li").eq(random).trigger("click");
		});
	}

	function onWindowResize()
	{
		windowHalfX = window.innerWidth / 2;
		windowHalfY = window.innerHeight / 2;

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);

		composer.reset( new THREE.WebGLRenderTarget( windowHalfX * 2, windowHalfY * 2, rtParams ) );
	}



	function onMouseMove(event)
	{
		mouseX = (event.clientX - windowHalfX) / 2;
		mouseY = (event.clientY - windowHalfY) / 2;
		if (dragging)
		{
			dragX = mouseX - startX;
			dragY = mouseY - startY;
			var factor = 1;;//Math.sqrt(zoom / largest);
			speedX = dragX / 200 * factor;
			speedY = dragY / 200 * factor;
		}
		castVector.set((event.clientX / window.innerWidth)*2-1, -(event.clientY/window.innerHeight)*2+1,0.5);
		projector.unprojectVector(castVector, camera);
	}

	var frametime = 0, realtime = 0;

	function animate()
	{
		this.lastRealtime = realtime;
		realtime = (new Date).getTime() / 1000;
		frametime = realtime - this.lastRealtime;

		requestAnimationFrame(animate);
		render();
	}

	function render()
	{
		if (object)
		{
			speedX *= 0.95;
			speedY *= 0.95;
			if (Math.abs(speedX) > 0.005) object.rotation.y += (speedX)/8;
			if (Math.abs(speedY) > 0.005) object.rotation.x += (speedY)/8;

			object.rotation.x = Math.min(Math.PI/2, Math.max(-Math.PI/2, object.rotation.x));
			if (Math.abs(camera.position.z - zoom) > 1) camera.position.z += (zoom - camera.position.z)/5;

			// Cast ray
			var ray = new THREE.Ray(camera.position, castVector.clone().subSelf(camera.position).normalize(), 0, 9000);
			var intersections = ray.intersectObject(object, true);
			if (intersections.length)
			{
				hitSphere.visible = false;
				intersection = intersections[0];
				//trails.position.copy(intersections[0].point.clone().subSelf(object.position));
				trails.position.copy(object.worldToLocal(intersections[0].point));
				trails.lookAt(trails.position.clone().subSelf(intersections[0].face.normal))
				//console.log(intersections[0].face);

				//trails.position.x = intersections[0].point.y;
				//trails.position.y = -intersections[0].point.x;
				//trails.position.z = intersections[0].point.z;

				//console.log(intersections.length);
				trails.traverse(function(o){o.visible=true;});
			}
			else
			{
				hitSphere.visible = false;
				intersection = null;
				trails.traverse(function(o){o.visible=false;});
			}

			object.position.x = Math.sin(realtime);
			object.position.y = Math.sin(realtime*1.2);
			object.position.z = Math.cos(realtime*1.5);

			var strength = Math.random()*0.4+0.6;
			for (var i=0; i<trailsNew.length; i++)
			{
				trailsNew[i].material.opacity = strength;
			}

		}


		//camera.position.x += (mouseX - camera.position.x) * 0.05;
		//camera.position.y += (mouseY - camera.position.y) * 0.05;
		camera.lookAt(scene.position);

		// Render scene


		composer.render();
		finalComposer.render();
	}

	// Interface
	this.init = init;
}


$(function()
{
	demo = new HomeworldDemo();
	demo.init();
});