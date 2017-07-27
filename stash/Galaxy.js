// The code written in BSD/KNF indent style
"use strict";

class GalaxySimulator {
	constructor(windowSystemRoot, rootWindow) {
		this.SysRoot = windowSystemRoot;
		this.rootWindow = rootWindow;
		this.rootWindow.style.overflow = "hidden";
		this.rootWindow.rootInstance = this;
		this.rootWindowStyle = window.getComputedStyle(this.rootWindow);
		this.loopEnded = true;

		this.touchCounter = 0;
		this.touchCounting = false;

		this.startstopButton = null;
		this.viewReal3DButton = null;
		this.particleNumChanger = null;
		this.BHNumChanger = null;
		this.BHNumChangeInvoked = false;
		this.particleNumChangeInvoked = false;
		this.viewReal3D = true;

		// Chasing the selected galaxy
		this.chaseBHInvoked = false;
		this.chaseBHClickedPos = {x: 0, y: 0};
		this.chaseBHDistance = 600;
		this.chasingBH = -1;

		this.timeClock = null;

		this.canvas = null;
		this.context = null;
		this.scale = 1.0;
		this.zScale = 0.05;


		this.cosmoSize = 800;
		this.galaxySize = 200;
		this.galaxyCenterRadius = 75;
		this.r_min = 0.1;
		this.dt = 0.1;
		this.G = 6.67259e-11;

		this.m_BH = 1.0e14;
		this.BHNum = 7;
		this.BH = new Array(this.BHNum);
		this.BH_postmp = new Array(this.BHNum);

		this.m = 1.0;
		this.particleNum = 3000;
		this.particle = new Array(this.particleNum);
		this.particle_postmp = new Array(this.particleNum);


		this.displayOffset = {x: 0, y: 0, z: 0};
		this.camera = {
			pos: {x: 0.0, y: 0.0, z: 0.0},
			view: {
				X: {x: 1.0, y: 0.0, z: 0.0},
				Y: {x: 0.0, y: 1.0, z: 0.0},
				Z: {x: 0.0, y: 0.0, z: -1.0}
			},
			F: 30
		};
		this.rotDegree = 3600;
		this.colormapQuantize = 200;
		this.colormap = {current: [], normal: new Array(this.colormapQuantize), bluesea: new Array(this.colormapQuantize)};

		this.prev_clientX = 0;
		this.prev_clientY = 0;

		// Initialize
		this.init();
	}

// ----- Initialize -----
	init()
	{
		// Make colormap
		this.makeColormap();
		this.colormap.current = this.colormap.normal;
		// Initialize canvas
		this.prepareCanvas();
		// Set event listener
		this.rootWindow.addEventListener("keydown", function (e) { e.currentTarget.rootInstance.keyDown(e); }, false);
		this.rootWindow.addEventListener("wheel", function (e) { e.currentTarget.rootInstance.wheelMove(e); }, false);
		// Create UI parts
		this.prepareTools();

		// Set display offset
		this.displayOffset.x = this.canvas.width / 2.0;
		this.displayOffset.y = this.canvas.height / 2.0;
		// Set camera position and view angle
		this.camera.pos = {x: 0, y: 0, z: this.cosmoSize};

		// Set initial position and velocity
		this.initGalaxy();

		// Start loop
		this.startLoop();
	}

	startLoop()
	{
		let root = this;
		this.timeClock = setInterval(function () { root.loop(); }, 25);
	}

	prepareCanvas()
	{
		// Initialize canvas
		this.canvas = document.createElement("canvas");
		this.canvas.rootInstance = this;
		this.canvas.id = "GalaxySimulatorMainPool";
		this.canvas.style.width = "100%";
		this.canvas.style.height = "100%";
		this.rootWindow.appendChild(this.canvas);
		this.canvas.addEventListener(
		    "windowdrag",
		    function (e) {
			    let style = window.getComputedStyle(e.currentTarget);
			    e.currentTarget.width = parseInt(style.width, 10);
			    e.currentTarget.height = parseInt(style.height, 10);
			    let root = e.currentTarget.rootInstance;
			    root.displayOffset.x = e.currentTarget.width / 2.0;
			    root.displayOffset.y = e.currentTarget.height / 2.0;
		    },
		    false);
		this.canvas.addEventListener("mousedown", function (e) { e.currentTarget.rootInstance.mouseClick(e); }, false);
		this.canvas.addEventListener("mousemove", function (e) { e.currentTarget.rootInstance.mouseMove(e); }, false);
		this.canvas.addEventListener("touchstart", function (e) { e.currentTarget.rootInstance.mouseClick(e); }, false);
		this.canvas.addEventListener("touchmove", function (e) { e.currentTarget.rootInstance.mouseMove(e); }, false);
		this.canvas.addEventListener("dblclick", function (e) { e.currentTarget.rootInstance.mouseDblClick(e); }, false);
		this.context = this.canvas.getContext("2d");
		// Initialize canvas size
		let canvasStyle = window.getComputedStyle(this.canvas);
		this.canvas.width = parseInt(canvasStyle.width, 10);
		this.canvas.height = parseInt(canvasStyle.height, 10);
	}

	prepareTools()
	{
		this.startstopButton = document.createElement("div");
		this.startstopButton.rootInstance = this;
		this.startstopButton.innerHTML = "startstop";
		this.startstopButton.id = "GalaxySimulatorStartStopButton";
		this.startstopButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.startstop(e); }, false);
		this.startstopButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.startstop(e); }, false);
		this.rootWindow.appendChild(this.startstopButton);

		this.viewReal3DButton = document.createElement("div");
		this.viewReal3DButton.rootInstance = this;
		this.viewReal3DButton.innerHTML = "to Pseudo3D";
		this.viewReal3DButton.id = "GalaxySimulatorViewReal3DButton";
		this.viewReal3DButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.switchViewReal3D(e); }, false);
		this.viewReal3DButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.switchViewReal3D(e); }, false);
		this.rootWindow.appendChild(this.viewReal3DButton);

		var particleNumChangerLabel = document.createElement("div");
		particleNumChangerLabel.innerHTML = "particle";
		particleNumChangerLabel.id = "GalaxySimulatorParticleNumChangerLabel";
		particleNumChangerLabel.className = "GalaxySimulatorInputLabel";
		this.rootWindow.appendChild(particleNumChangerLabel);
		this.particleNumChanger = document.createElement("input");
		this.particleNumChanger.rootInstance = this;
		this.particleNumChanger.type = "text";
		this.particleNumChanger.inputmode = "numeric";
		this.particleNumChanger.value = this.particleNum;
		this.particleNumChanger.id = "GalaxySimulatorParticleNumChanger";
		this.particleNumChanger.className = "GalaxySimulatorInput";
		this.particleNumChanger.addEventListener("change", function (e) { e.preventDefault(); e.currentTarget.rootInstance.particleNumChangeInvoked = true; }, false);
		this.rootWindow.appendChild(this.particleNumChanger);

		var BHNumChangerLabel = document.createElement("div");
		BHNumChangerLabel.innerHTML = "black hole";
		BHNumChangerLabel.id = "GalaxySimulatorBHNumChangerLabel";
		BHNumChangerLabel.className = "GalaxySimulatorInputLabel";
		this.rootWindow.appendChild(BHNumChangerLabel);
		this.BHNumChanger = document.createElement("input");
		this.BHNumChanger.rootInstance = this;
		this.BHNumChanger.type = "text";
		this.BHNumChanger.inputmode = "numeric";
		this.BHNumChanger.value = this.BHNum;
		this.BHNumChanger.id = "GalaxySimulatorBHNumChanger";
		this.BHNumChanger.className = "GalaxySimulatorInput";
		this.BHNumChanger.addEventListener("change", function (e) { e.preventDefault(); e.currentTarget.rootInstance.BHNumChangeInvoked = true; }, false);
		this.rootWindow.appendChild(this.BHNumChanger);
	}

	initGalaxy() {
		let velInitMaxBH = 12;
		let torque = new Array(3);
		for (let N = 0; N < this.BHNum; N++) {
			this.BH[N] = {
				position: {
					x: this.cosmoSize * (Math.random() - 0.5),
					y: this.cosmoSize * (Math.random() - 0.5),
					z: this.cosmoSize * (Math.random() - 0.5)
				},
				velocity: {
					x: velInitMaxBH * (Math.random() - 0.5),
					y: velInitMaxBH * (Math.random() - 0.5),
					z: velInitMaxBH * (Math.random() - 0.5)
				}
			    };
			this.BH_postmp[N] = {x: 0.0, y: 0.0, z: 0.0};
			torque[N] = {X: {x: 1.0, y: 0.0, z: 0.0}, Y: {x: 0.0, y: 1.0, z: 0.0}, Z: {x: 0.0, y: 0.0, z: 1.0}};
			torque[N] = this.rotXYZ(
			    torque[N],
			    2 * Math.PI * Math.random(),
			    2 * Math.PI * Math.random());
		}
		for (let n = 0; n < this.particleNum; n++) {
			let N = n % this.BHNum;
			let p = this.BH[N].position;
			let r_pre = {
				x: this.galaxySize * (Math.random() - 0.5),
				y: this.galaxySize * (Math.random() - 0.5),
				z: 0};
			let r_xy = Math.sqrt(r_pre.x * r_pre.x + r_pre.y * r_pre.y);
			if (r_xy > this.galaxyCenterRadius) {
				r_pre.z = 0.0625 * this.galaxySize * (Math.random() - 0.5);
			} else {
				r_pre.z = Math.cos(Math.PI / 2 * r_xy / this.galaxyCenterRadius) * this.galaxyCenterRadius * (Math.random() - 0.5);
			}
			let r = {
				x: torque[N].X.x * r_pre.x + torque[N].Y.x * r_pre.y + torque[N].Z.x * r_pre.z,
				y: torque[N].X.y * r_pre.x + torque[N].Y.y * r_pre.y + torque[N].Z.y * r_pre.z,
				z: torque[N].X.z * r_pre.x + torque[N].Y.z * r_pre.y + torque[N].Z.z * r_pre.z};
			let v_norm = this.normalizeVect(this.crossProduct(torque[N].Z, r));
			let r_abs = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
			// r w^2 = G M / r^2
			// v^2 = G M / r where v = r w
			// v = sqrt(G M / r)
			let vel = Math.sqrt(this.G * this.m_BH / r_abs);
			this.particle[n] = {
				position: {
					x: p.x + r.x,
					y: p.y + r.y,
					z: p.z + r.z
				},
				velocity: {
					x: vel * v_norm.x + this.BH[N].velocity.x,
					y: vel * v_norm.y + this.BH[N].velocity.y,
					z: vel * v_norm.z + this.BH[N].velocity.z
				},
				id: N
			    };
			this.particle_postmp[n] = {x: 0.0, y: 0.0, z: 0.0};
		}
	}


	// ----- Start Simulation -----
	loop()
	{
		if (!this.loopEnded) {
			return;
		}
		if (this.BHNumChangeInvoked) {
			this.BHNumChangeInvoked = false;
			this.BHNumChange();
		}
		if (this.particleNumChangeInvoked) {
			this.particleNumChangeInvoked = false;
			this.particleNumChange();
		}
		this.automation();
		this.physics();
		this.draw();
		this.loopEnded = true;
	}



	// ----- REALTIME -----
	asin(y)
	{
		if (-1.0 < y && y < 1.0) {
			return Math.asin(y);
		} else if (y > 0) {
			return 0.25 * Math.PI;
		} else {
			return -0.25 * Math.PI;
		}
	}

	automation()
	{
		if (this.chasingBH >= 0) {
			let N = this.chasingBH;
			let d;
			d = this.BH[N].position.x - this.camera.view.Z.x * this.chaseBHDistance - this.camera.pos.x;
			this.camera.pos.x += Math.sign(d) * Math.sqrt(Math.abs(d));
			d = this.BH[N].position.y - this.camera.view.Z.y * this.chaseBHDistance - this.camera.pos.y;
			this.camera.pos.y += Math.sign(d) * Math.sqrt(Math.abs(d));
			d = this.BH[N].position.z - this.camera.view.Z.z * this.chaseBHDistance - this.camera.pos.z;
			this.camera.pos.z += Math.sign(d) * Math.sqrt(Math.abs(d));
		}
	}

	physics()
	{
		for (let n = 0; n < this.particleNum; n++) {
			let f = {x: 0, y: 0, z: 0};
			for (let N = 0; N < this.BHNum; N++) {
				let x = this.BH[N].position.x - this.particle[n].position.x;
				let y = this.BH[N].position.y - this.particle[n].position.y;
				let z = this.BH[N].position.z - this.particle[n].position.z;
				let one_div_r = Math.pow(Math.max(this.r_min, x * x + y * y + z * z), -1.5);
				f.x += x * one_div_r;
				f.y += y * one_div_r;
				f.z += z * one_div_r;
			}
			f.x *= this.G * this.m_BH;
			f.y *= this.G * this.m_BH;
			f.z *= this.G * this.m_BH;
			this.particle[n].velocity.x += f.x * this.dt;
			this.particle[n].velocity.y += f.y * this.dt;
			this.particle[n].velocity.z += f.z * this.dt;
			this.particle_postmp[n].x = this.particle[n].position.x + this.particle[n].velocity.x * this.dt;
			this.particle_postmp[n].y = this.particle[n].position.y + this.particle[n].velocity.y * this.dt;
			this.particle_postmp[n].z = this.particle[n].position.z + this.particle[n].velocity.z * this.dt;
		}
		for (let n = 0; n < this.particleNum; n++) {
			this.particle[n].position = this.particle_postmp[n];
		}
		for (let N = 0; N < this.BHNum; N++) {
			let f = {x: 0, y: 0, z: 0};
			for (let N_o = 0; N_o < this.BHNum; N_o++) {
				if (N == N_o) {
					continue;
				}
				let x = this.BH[N_o].position.x - this.BH[N].position.x;
				let y = this.BH[N_o].position.y - this.BH[N].position.y;
				let z = this.BH[N_o].position.z - this.BH[N].position.z;
				let one_div_r = Math.pow(Math.max(this.r_min, x * x + y * y + z * z), -1.5);
				f.x += x * one_div_r;
				f.y += y * one_div_r;
				f.z += z * one_div_r;
			}
			f.x *= this.G * this.m_BH;
			f.y *= this.G * this.m_BH;
			f.z *= this.G * this.m_BH;
			this.BH[N].velocity.x += f.x * this.dt;
			this.BH[N].velocity.y += f.y * this.dt;
			this.BH[N].velocity.z += f.z * this.dt;
			this.BH_postmp[N].x = this.BH[N].position.x + this.BH[N].velocity.x * this.dt;
			this.BH_postmp[N].y = this.BH[N].position.y + this.BH[N].velocity.y * this.dt;
			this.BH_postmp[N].z = this.BH[N].position.z + this.BH[N].velocity.z * this.dt;
		}
		for (let N = 0; N < this.BHNum; N++) {
			this.BH[N].position = this.BH_postmp[N];
		}
	}

	makeColormap()
	{
		let dc = 255 / (this.colormapQuantize / 2);
		// Make colormap normal
		for (let i = 0; i <= Math.floor(this.colormapQuantize / 2); i++) {
			this.colormap.normal[i] = 'rgb(0,' + Math.min(255, Math.ceil(dc * i)) + ',' + Math.max(0, 255 - Math.ceil(dc * i)) + ')';
		}
		for (let i = Math.floor(this.colormapQuantize / 2); i < this.colormapQuantize; i++) {
			this.colormap.normal[i] = 'rgb(' + Math.min(255, Math.ceil(dc * (i - this.colormapQuantize / 2))) + ',' + Math.max(0, 255 - Math.ceil(dc * (i - this.colormapQuantize / 2))) + ',0)';
		}
		// Make colormap bluesea
		dc = 255 / this.colormapQuantize;
		for (let i = 0; i < this.colormapQuantize; i++) {
			this.colormap.bluesea[i] = 'rgb(' + Math.min(255, Math.ceil(dc / 2 * i)) + ',' + Math.min(255, Math.ceil(dc * i)) + ',255)';
		}
	}

	draw()
	{
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.drawParticle();
		this.drawBH();
		this.drawXYZVector();
	}

	drawParticle()
	{
		let xy = {x: 0, y: 0};
		for (let n = 0; n < this.particleNum; n++) {
			xy = this.calcView(
			    this.particle[n].position.x,
			    this.particle[n].position.y,
			    this.particle[n].position.z,
			    this.scale,
			    this.camera);
			if (xy.z > this.camera.F) {
				let r = this.normVect(xy);
				this.context.strokeStyle = this.colormap.current[(this.particle[n].id * 29) % this.colormapQuantize];
				this.context.beginPath();
				this.context.arc(xy.x + this.displayOffset.x, xy.y + this.displayOffset.y, Math.max(0.1, 0.5 / (this.zScale * r)), 0, 2 * Math.PI, false);
				this.context.stroke();
			}
		}
	}

	drawBH()
	{
		let xy = {x: 0, y: 0};
		let vel;
		let dist = -1;
		this.context.strokeStyle = 'blue';
		for (let N = 0; N < this.BHNum; N++) {
			vel = 100 * Math.sqrt(
			    this.BH[N].velocity.x * this.BH[N].velocity.x +
			    this.BH[N].velocity.y * this.BH[N].velocity.y +
			    this.BH[N].velocity.z * this.BH[N].velocity.z);
			xy = this.calcView(
			    this.BH[N].position.x,
			    this.BH[N].position.y,
			    this.BH[N].position.z,
			    this.scale,
			    this.camera);
			if (xy.z > this.camera.F) {
				this.context.strokeStyle = 'rgb(255, 0, 0)';
				this.context.beginPath();
				let r = this.normVect(xy);
				this.context.arc(xy.x + this.displayOffset.x, xy.y + this.displayOffset.y, Math.min(3, Math.max(1, 3 / (this.zScale * r))), 0, 2 * Math.PI, false);
				this.context.stroke();
			}
			if (this.chaseBHInvoked) {
				let d =
				    Math.pow(this.chaseBHClickedPos.x - xy.x - this.displayOffset.x, 2) +
				    Math.pow(this.chaseBHClickedPos.y - xy.y - this.displayOffset.y, 2);
				if (dist < 0) {
					dist = d;
					this.chasingBH = N;
				} else if (d < dist) {
					dist = d;
					this.chasingBH = N;
				}
			}
		}
		this.chaseBHInvoked = false;
	}

	drawXYZVector()
	{
		let fieldXYZ = {
			X: {x: 1, y: 0, z: 0},
			Y: {x: 0, y: 1, z: 0},
			Z: {x: 0, y: 0, z: 1}
		};
		// Show XYZ coordinate
		this.context.lineWidth = 2;
		this.context.beginPath();
		this.context.moveTo(42, 42);
		this.context.strokeStyle = "red";
		this.context.lineTo(42 + 42 * fieldXYZ.X.x, 42 + 42 * fieldXYZ.X.y);
		let xy = this.calcXYZOnXYZ(-7, -7, 0, fieldXYZ);
		this.context.lineTo(42 + 42 * fieldXYZ.X.x + xy.x, 42 + 42 * fieldXYZ.X.y + xy.y);
		xy = this.calcXYZOnXYZ(-7, 8, 0, fieldXYZ);
		this.context.lineTo(42 + 42 * fieldXYZ.X.x + xy.x, 42 + 42 * fieldXYZ.X.y + xy.y);
		this.context.stroke();
		this.context.beginPath();
		this.context.moveTo(42, 42);
		this.context.strokeStyle = "lime";
		this.context.lineTo(42 + 42 * fieldXYZ.Y.x, 42 + 42 * fieldXYZ.Y.y);
		xy = this.calcXYZOnXYZ(7, -7, 0, fieldXYZ);
		this.context.lineTo(42 + 42 * fieldXYZ.Y.x + xy.x, 42 + 42 * fieldXYZ.Y.y + xy.y);
		xy = this.calcXYZOnXYZ(-8, -7, 0, fieldXYZ);
		this.context.lineTo(42 + 42 * fieldXYZ.Y.x + xy.x, 42 + 42 * fieldXYZ.Y.y + xy.y);
		this.context.stroke();
		this.context.beginPath();
		this.context.moveTo(42, 42);
		this.context.strokeStyle = "blue";
		this.context.lineTo(42 + 42 * fieldXYZ.Z.x, 42 + 42 * fieldXYZ.Z.y);
		xy = this.calcXYZOnXYZ(0, 7, -7, fieldXYZ);
		this.context.lineTo(42 + 42 * fieldXYZ.Z.x + xy.x, 42 + 42 * fieldXYZ.Z.y + xy.y);
		xy = this.calcXYZOnXYZ(0, -8, -7, fieldXYZ);
		this.context.lineTo(42 + 42 * fieldXYZ.Z.x + xy.x, 42 + 42 * fieldXYZ.Z.y + xy.y);
		this.context.stroke();
		this.context.lineWidth = 1;
	}

	calcNormalVector(edges)
	{
		let vector = {x: 0, y: 0, z: 0};
		if (edges.length < 3) {
			return vector;
		}
		let a = {
		    x: edges[2].x - edges[1].x,
		    y: edges[2].y - edges[1].y,
		    z: edges[2].z - edges[1].z};
		let b = {
		    x: edges[0].x - edges[1].x,
		    y: edges[0].y - edges[1].y,
		    z: edges[0].z - edges[1].z};
		vector.x = a.y * b.z - a.z * b.y;
		vector.y = a.z * b.x - a.x * b.z;
		vector.z = a.x * b.y - a.y * b.x;
		let norm = this.normVect(vector);
		if (norm > 0.01) {
			vector.x /= norm;
			vector.y /= norm;
			vector.z /= norm;
		}
		return vector;
	}

	calcXYZOnXYZ(x, y, z, XYZ)
	{
		let xy = {x: 0, y: 0};
		xy.x = x * XYZ.X.x + y * XYZ.Y.x + z * XYZ.Z.x;
		xy.y = x * XYZ.X.y + y * XYZ.Y.y + z * XYZ.Z.y;
		return xy;
	}

	calcView(x, y, z, scale, camera)
	{
		let xy = {x: 0, y: 0, z: 0};
		let X = x - camera.pos.x;
		let Y = y - camera.pos.y;
		let Z = z - camera.pos.z;
		xy.z = scale * (X * camera.view.X.z + Y * camera.view.Y.z + Z * camera.view.Z.z);
		if (this.viewReal3D) {
			let z_scaled = this.zScale * xy.z;
			xy.x = scale * (X * camera.view.X.x + Y * camera.view.Y.x + Z * camera.view.Z.x) *
			    this.camera.F / Math.max(Number.EPSILON, z_scaled);
			xy.y = scale * (X * camera.view.X.y + Y * camera.view.Y.y + Z * camera.view.Z.y) *
			    this.camera.F / Math.max(Number.EPSILON, z_scaled);
		} else {
			xy.x = scale * (X * camera.view.X.x + Y * camera.view.Y.x + Z * camera.view.Z.x);
			xy.y = scale * (X * camera.view.X.y + Y * camera.view.Y.y + Z * camera.view.Z.y);
		}
		return xy;
	}

	normVect(xyz)
	{
		return Math.sqrt(xyz.x * xyz.x + xyz.y * xyz.y + xyz.z * xyz.z);
	}

	innerProductXYZ(A, B)
	{
		return A.x * B.x + A.y * B.y + A.z * B.z;
	}

	normalizeVect(xyz)
	{
		let norm = this.normVect(xyz);
		if (norm > 0.1) {
			xyz.x /= norm;
			xyz.y /= norm;
			xyz.z /= norm;
		}
		return xyz;
	}
	
	crossProduct(X, Y)
	{
		let Z = {x: 0, y: 0, z: 0};
		Z.x = X.y * Y.z - X.z * Y.y;
		Z.y = X.z * Y.x - X.x * Y.z;
		Z.z = X.x * Y.y - X.y * Y.x;
		return Z;
	}

	rotate(xyz, y, xp)
	{
		let ret = {x: 0, y: 0, z: 0};
		ret.x = xyz.x * Math.cos(y) - xyz.z * Math.sin(y);
		ret.z = xyz.z * Math.cos(y) + xyz.x * Math.sin(y);
		ret.y = xyz.y * Math.cos(xp) - ret.z * Math.sin(xp);
		ret.z = ret.z * Math.cos(xp) + xyz.y * Math.sin(xp);
		return ret;
	}

	// rotate normalized dimension vectors and output rotated vectors with normalizing
	// note: this function do not return any value and modify the first argument;
	rotXYZ(XYZ, y, xp)
	{
		let XYZrotated = {
		    X: {x: 0, y: 0, z: 0},
		    Y: {x: 0, y: 0, z: 0},
		    Z: {x: 0, y: 0, z: 0}};
		XYZrotated.X = this.rotate(XYZ.X, y, xp);
		XYZrotated.Y = this.rotate(XYZ.Y, y, xp);
		XYZrotated.Z = this.rotate(XYZ.Z, y, xp);
		// Normalize
		XYZrotated.X = this.normalizeVect(XYZrotated.X);
		XYZrotated.Y = this.normalizeVect(XYZrotated.Y);
		XYZrotated.Z = this.normalizeVect(XYZrotated.Z);
		// Reduce residue of Y
		let a = this.innerProductXYZ(XYZrotated.X, XYZrotated.Y);
		XYZrotated.Y.x -= a * XYZrotated.X.x;
		XYZrotated.Y.y -= a * XYZrotated.X.y;
		XYZrotated.Y.z -= a * XYZrotated.X.z;
		// Reduce residue of Z
		a = this.innerProductXYZ(XYZrotated.X, XYZrotated.Z);
		XYZrotated.Z.x -= a * XYZrotated.X.x;
		XYZrotated.Z.y -= a * XYZrotated.X.y;
		XYZrotated.Z.z -= a * XYZrotated.X.z;
		a = this.innerProductXYZ(XYZrotated.Y, XYZrotated.Z);
		XYZrotated.Z.x -= a * XYZrotated.Y.x;
		XYZrotated.Z.y -= a * XYZrotated.Y.y;
		XYZrotated.Z.z -= a * XYZrotated.Y.z;
		return XYZrotated;
	}

	rotate3d(XYZ, rolling)
	{
		let di_r = {x: 0, y: 0, z: 0};
		let di_p = {x: 0, y: 0, z: 0};
		let di_y = {x: 0, y: 0, z: 0};
		let di_py = {x: 0, y: 0, z: 0};
		let di = {x: 0, y: 0, z: 0};
		// Yaw
		di_y.x =
		    XYZ.x * Math.cos(rolling.yaw) -
		    XYZ.y * Math.sin(rolling.yaw) -
		    XYZ.x;
		di_y.y =
		    XYZ.y * Math.cos(rolling.yaw) +
		    XYZ.x * Math.sin(rolling.yaw) -
		    XYZ.y;
		// Pitch
		di_p.x =
		    XYZ.x * Math.cos(rolling.pitch) +
		    XYZ.z * Math.sin(rolling.pitch) -
		    XYZ.x;
		di_p.z =
		    XYZ.z * Math.cos(rolling.pitch) -
		    XYZ.x * Math.sin(rolling.pitch) -
		    XYZ.z;
		di_py.x = di_p.x + di_y.x * Math.cos(rolling.pitch);
		di_py.y = di_y.y;
		di_py.z = di_p.z - di_y.x * Math.sin(rolling.pitch);
		// Roll
		di_r.y =
		    XYZ.y * Math.cos(rolling.roll) -
		    XYZ.z * Math.sin(rolling.roll) -
		    XYZ.y;
		di_r.z =
		    XYZ.z * Math.cos(rolling.roll) +
		    XYZ.y * Math.sin(rolling.roll) -
		    XYZ.z;
		di.x = di_py.x;
		di.y =
		    di_r.y +
		    di_py.y * Math.cos(rolling.roll) -
		    di_py.z * Math.sin(rolling.roll);
		di.z =
		    di_r.z +
		    di_py.z * Math.cos(rolling.roll) +
		    di_py.y * Math.sin(rolling.roll);
		return {x: XYZ.x + di.x, y: XYZ.y + di.y, z: XYZ.z + di.z};
	}

	mouseClick(event)
	{
		event.preventDefault();
		let root = this;
		if (event.type === "mousedown") {
			this.prev_clientX = event.clientX;
			this.prev_clientY = event.clientY;
		} else if (event.type === "touchstart") {
			this.prev_clientX = event.touches[0].clientX;
			this.prev_clientY = event.touches[0].clientY;
			if (this.touchCounting) {
				this.touchDblTap(event);
			}
			// Set touchCounting should be at end of event processing
			this.touchCounting = true;
			clearTimeout(this.touchCounter);
			this.touchCounter = setTimeout(function () { console.log("clear"); root.touchCounting = false; }, 200);
		}
	}

	mouseMove(event)
	{
		event.preventDefault();
		if (event.type === "mousemove") {
			if ((event.buttons & 1) != 0) {
				this.camera.view = this.rotXYZ(this.camera.view,
				    2.0 * Math.PI * (event.clientX - this.prev_clientX) / this.rotDegree,
				    2.0 * Math.PI * (event.clientY - this.prev_clientY) / this.rotDegree);
			} else if ((event.buttons & 4) != 0) {
				let move = {x: 0, y: 0};
				move.x = (event.clientX - this.prev_clientX) / this.scale;
				move.y = (event.clientY - this.prev_clientY) / this.scale;
				this.camera.pos.x -= move.x * this.camera.view.X.x + move.y * this.camera.view.Y.x;
				this.camera.pos.y -= move.x * this.camera.view.X.y + move.y * this.camera.view.Y.y;
			}
			this.prev_clientX = event.clientX;
			this.prev_clientY = event.clientY;
		} else if (event.type === "touchmove") {
			if (event.touches.length == 1) {
				this.camera.view = this.rotXYZ(this.camera.view,
				    2.0 * Math.PI * (event.touches[0].clientX - this.prev_clientX) / this.rotDegree,
				    2.0 * Math.PI * (event.touches[0].clientY - this.prev_clientY) / this.rotDegree);
			} else if (event.touches.length == 2) {
				let move = {x: 0, y: 0};
				move.x = (event.touches[0].clientX - this.prev_clientX) / this.scale;
				move.y = (event.touches[0].clientY - this.prev_clientY) / this.scale;
				this.camera.pos.x -= move.x * this.camera.view.X.x + move.y * this.camera.view.Y.x;
				this.camera.pos.y -= move.x * this.camera.view.X.y + move.y * this.camera.view.Y.y;
			}
			this.prev_clientX = event.touches[0].clientX;
			this.prev_clientY = event.touches[0].clientY;
		}
	}

	mouseDblClick(event)
	{
		event.preventDefault();
		this.chaseBHInvoked = true;
		this.chaseBHClickedPos = {x: event.clientX, y: event.clientY};
	}

	touchDblTap(event)
	{
		this.chaseBHInvoked = true;
		this.chaseBHClickedPos = {x: event.touches[0].clientX, y: event.touches[0].clientY};
	}

	keyDown(event)
	{
		switch (event.key) {
			case "ArrowUp":
				break;
			case "ArrowDown":
				break;
			case "ArrowLeft":
				break;
			case "ArrowRight":
				break;
		}
	}

	wheelMove(event)
	{
		event.preventDefault();
		if (this.viewReal3D) {
			this.camera.pos.x -= this.camera.view.Z.x * event.deltaY * this.scale;
			this.camera.pos.y -= this.camera.view.Z.y * event.deltaY * this.scale;
			this.camera.pos.z -= this.camera.view.Z.z * event.deltaY * this.scale;
		} else {
			this.scale = Math.exp(Math.log(this.scale) - event.deltaY * 0.001);
		}
	}

	startstop()
	{
		if (this.timeClock) {
			clearInterval(this.timeClock);
			this.timeClock = null;
		} else {
			this.startLoop();
		}
	}

	switchViewReal3D()
	{
		this.viewReal3D = !this.viewReal3D;
		if (this.viewReal3D) {
			this.viewReal3DButton.innerHTML = "to Pseudo3D";
		} else {
			this.viewReal3DButton.innerHTML = "to Real3D";
		}
	}

	BHNumChange()
	{
		let val = this.BHNumChanger.value;
		if (val < 1) {
			val = 1;
		}
		let increase = false;
		if (val > this.BHNum) {
			increase = true;
		}
		this.BHNum = val;
		if (increase) {
			this.initGalaxy();
		}
	}

	particleNumChange()
	{
		let val = this.particleNumChanger.value;
		if (val < 0) {
			val = 0;
		}
		let increase = false;
		if (val > this.particleNum) {
			increase = true;
		}
		this.particleNum = val;
		if (increase) {
			this.initGalaxy();
		}
	}
}

