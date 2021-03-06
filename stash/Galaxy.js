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
		this.overwritingButton = null;
		this.view3DButton = null;
		this.particleNumChanger = null;
		this.particleNumChangerLabel = null;
		this.particleNumChangeInvoked = false;
		this.BHNumChanger = null;
		this.BHNumChangerLabel = null;
		this.BHNumChangeInvoked = false;
		this.overwriting = false;
		this.view3D = 0;
		this.eyesDistance = 30;

		// Chasing the selected galaxy
		this.chaseBHInvoked = false;
		this.chaseBHClickedPos = {x: 0, y: 0};
		this.chaseBHDistance = 600;
		this.chasingBH = -1;
		this.chasingBHDistanceCurrent = 600;

		this.timeClock = null;

		this.canvas = null;
		this.context = null;
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
		this.BHCoreSize = 8;

		this.m = 1.0;
		this.particleNum = 3000;
		this.particle = new Array(this.particleNum);


		this.XYZ_absolute = {
			X: {x: 1.0, y: 0.0, z: 0.0},
			Y: {x: 0.0, y: 1.0, z: 0.0},
			Z: {x: 0.0, y: 0.0, z: 1.0}
		};
		this.displayOffset = {x: 0, y: 0, z: 0};
		this.camera = {
			pos: {x: 0.0, y: 0.0, z: 0.0},
			view: {
				X: {x: 1.0, y: 0.0, z: 0.0},
				Y: {x: 0.0, y: -1.0, z: 0.0},
				Z: {x: 0.0, y: 0.0, z: -1.0}
			},
			F: 30
		};
		this.rotDegree = 3600;
		this.colormapQuantize = 200;
		this.colormap = {current: [], normal: new Array(this.colormapQuantize), bluesea: new Array(this.colormapQuantize)};

		this.prev_mouse = {x: 0, y: 0};
		this.prev_touches = [];

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

		this.overwritingButton = document.createElement("div");
		this.overwritingButton.rootInstance = this;
		this.overwritingButton.innerHTML = "Overwriting";
		this.overwritingButton.id = "GalaxySimulatorOverWritingButton";
		this.overwritingButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.switchOverwriting(e); }, false);
		this.overwritingButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.switchOverwriting(e); }, false);
		this.rootWindow.appendChild(this.overwritingButton);

		this.view3DButton = document.createElement("div");
		this.view3DButton.rootInstance = this;
		this.view3DButton.innerHTML = "3D view switch (normal)";
		this.view3DButton.id = "GalaxySimulatorView3DButton";
		this.view3DButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.switchView3D(e); }, false);
		this.view3DButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.switchView3D(e); }, false);
		this.rootWindow.appendChild(this.view3DButton);

		this.particleNumChangerLabel = document.createElement("div");
		this.particleNumChangerLabel.innerHTML = "particle";
		this.particleNumChangerLabel.id = "GalaxySimulatorParticleNumChangerLabel";
		this.particleNumChangerLabel.className = "GalaxySimulatorInputLabel";
		this.rootWindow.appendChild(this.particleNumChangerLabel);
		this.particleNumChanger = document.createElement("input");
		this.particleNumChanger.rootInstance = this;
		this.particleNumChanger.type = "text";
		this.particleNumChanger.inputmode = "numeric";
		this.particleNumChanger.value = this.particleNum;
		this.particleNumChanger.id = "GalaxySimulatorParticleNumChanger";
		this.particleNumChanger.className = "GalaxySimulatorInput";
		this.particleNumChanger.addEventListener("change", function (e) { e.preventDefault(); e.currentTarget.rootInstance.particleNumChangeInvoked = true; }, false);
		this.rootWindow.appendChild(this.particleNumChanger);

		this.BHNumChangerLabel = document.createElement("div");
		this.BHNumChangerLabel.innerHTML = "black hole";
		this.BHNumChangerLabel.id = "GalaxySimulatorBHNumChangerLabel";
		this.BHNumChangerLabel.className = "GalaxySimulatorInputLabel";
		this.rootWindow.appendChild(this.BHNumChangerLabel);
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
			let Distance = this.chaseBHDistance;
			Distance = this.chasingBHDistanceCurrent;
			d = this.BH[N].position.x - this.camera.view.Z.x * this.chasingBHDistanceCurrent - this.camera.pos.x;
			this.camera.pos.x += Math.sign(d) * Math.sqrt(Math.abs(d));
			d = this.BH[N].position.y - this.camera.view.Z.y * this.chasingBHDistanceCurrent  - this.camera.pos.y;
			this.camera.pos.y += Math.sign(d) * Math.sqrt(Math.abs(d));
			d = this.BH[N].position.z - this.camera.view.Z.z * this.chasingBHDistanceCurrent  - this.camera.pos.z;
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
		}
		for (let n = 0; n < this.particleNum; n++) {
			this.particle[n].position.x += this.particle[n].velocity.x * this.dt;
			this.particle[n].position.y += this.particle[n].velocity.y * this.dt;
			this.particle[n].position.z += this.particle[n].velocity.z * this.dt;
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
		}
		for (let N = 0; N < this.BHNum; N++) {
			this.BH[N].position.x += this.BH[N].velocity.x * this.dt;
			this.BH[N].position.y += this.BH[N].velocity.y * this.dt;
			this.BH[N].position.z += this.BH[N].velocity.z * this.dt;
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

	viewModified()
	{
		let newWindowSize = {x: parseInt(this.rootWindowStyle.width, 10), y: parseInt(this.rootWindowStyle.height, 10)};
		if (this.canvas.width != newWindowSize.x ||
		    this.canvas.height != newWindowSize.y) {
			this.canvas.width = newWindowSize.x;
			this.canvas.height = newWindowSize.y;
			this.displayOffset.x = newWindowSize.x / 2;
			this.displayOffset.y = newWindowSize.y / 2;
		}
	}

	draw()
	{
		let drawArea = {left: 0, right: this.canvas.width, top: 0, bottom: this.canvas.height};
		this.viewModified();
		if (!this.overwriting) {
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}
		if (this.view3D != 0) { // 3D view
			let drawAreaL = {left: 0, right: Math.floor(this.canvas.width / 2), top: 0, bottom: this.canvas.height};
			let drawAreaR = {left: Math.floor(this.canvas.width / 2 + 1), right: this.canvas.width, top: 0, bottom: this.canvas.height};
			let displayOffsetL = {x: Math.floor(this.displayOffset.x / 2), y: this.displayOffset.y, z: 0};
			let displayOffsetR = {x: Math.floor(this.displayOffset.x / 2) + drawAreaR.left, y: this.displayOffset.y, z: 0};
			let cameraL = {
				F: this.camera.F,
				pos: {x: this.camera.pos.x, y: this.camera.pos.y, z: this.camera.pos.z},
				view: {
					X: {x: this.camera.view.X.x, y: this.camera.view.X.y, z: this.camera.view.X.z},
					Y: {x: this.camera.view.Y.x, y: this.camera.view.Y.y, z: this.camera.view.Y.z},
					Z: {x: this.camera.view.Z.x, y: this.camera.view.Z.y, z: this.camera.view.Z.z}
				}
			};
			let cameraR = {
				F: this.camera.F,
				pos: {
					x: this.camera.pos.x,
					y: this.camera.pos.y,
					z: this.camera.pos.z},
				view: {
					X: {x: this.camera.view.X.x, y: this.camera.view.X.y, z: this.camera.view.X.z},
					Y: {x: this.camera.view.Y.x, y: this.camera.view.Y.y, z: this.camera.view.Y.z},
					Z: {x: this.camera.view.Z.x, y: this.camera.view.Z.y, z: this.camera.view.Z.z}
				}
			};
			if (this.view3D == 1) { // crossing view
				cameraR.pos.x -= this.camera.view.X.x * this.eyesDistance;
				cameraR.pos.y -= this.camera.view.X.y * this.eyesDistance;
				cameraR.pos.z -= this.camera.view.X.z * this.eyesDistance;
			} else { // parallel view
				cameraR.pos.x += this.camera.view.X.x * this.eyesDistance;
				cameraR.pos.y += this.camera.view.X.y * this.eyesDistance;
				cameraR.pos.z += this.camera.view.X.z * this.eyesDistance;
			}
			this.drawParticle(cameraL, displayOffsetL, drawAreaL);
			this.drawBH(cameraL, displayOffsetL, drawAreaL);
			this.drawParticle(cameraR, displayOffsetR, drawAreaR);
			this.drawBH(cameraR, displayOffsetR, drawAreaR);
		} else {
			this.drawParticle(this.camera, this.displayOffset, drawArea);
			this.drawBH(this.camera, this.displayOffset, drawArea);
		}
		this.drawXYZVector();
	}

	drawParticle(camera, offset, area)
	{
		let xyz = {x: 0, y: 0, z: 0};
		this.context.lineWidth = 0.75;
		for (let n = 0; n < this.particleNum; n++) {
			xyz = this.calcView(
			    this.particle[n].position.x,
			    this.particle[n].position.y,
			    this.particle[n].position.z,
			    camera);
			xyz.x += offset.x;
			xyz.y += offset.y;
			xyz.z += offset.z;
			if (area.left <= xyz.x && xyz.x < area.right &&
			    area.top <= xyz.y && xyz.y < area.bottom &&
			    xyz.z > camera.F) {
				this.context.strokeStyle = this.colormap.current[(this.particle[n].id * 29) % this.colormapQuantize];
				this.context.beginPath();
				this.context.arc(xyz.x, xyz.y, Math.max(0.05, 1.0 * this.camera.F / (this.zScale * xyz.z)), 0, 2 * Math.PI, false);
				this.context.stroke();
			}
		}
		this.context.lineWidth = 1;
	}

	drawBH(camera, offset, area)
	{
		let xyz = {x: 0, y: 0};
		let vel;
		let dist = -1;
		let newChasingBH = -1;

		this.context.strokeStyle = 'rgb(255, 0, 0)';
		this.context.lineWidth = 1.5;
		for (let N = 0; N < this.BHNum; N++) {
			vel = 100 * Math.sqrt(
			    this.BH[N].velocity.x * this.BH[N].velocity.x +
			    this.BH[N].velocity.y * this.BH[N].velocity.y +
			    this.BH[N].velocity.z * this.BH[N].velocity.z);
			xyz = this.calcView(
			    this.BH[N].position.x,
			    this.BH[N].position.y,
			    this.BH[N].position.z,
			    camera);
			// Add view offset
			xyz.x += offset.x;
			xyz.y += offset.y;
			xyz.z += offset.z;
			if (area.left <= xyz.x && xyz.x < area.right &&
			    area.top <= xyz.y && xyz.y < area.bottom &&
			    xyz.z > camera.F) {
				this.context.beginPath();
				this.context.arc(xyz.x, xyz.y, Math.max(1, this.BHCoreSize * this.camera.F / (this.zScale * xyz.z)), 0, 2 * Math.PI, false);
				this.context.stroke();
			}
			if (this.chaseBHInvoked) {
				let d =
				    Math.pow(this.chaseBHClickedPos.x - xyz.x, 2) +
				    Math.pow(this.chaseBHClickedPos.y - xyz.y, 2);
				if (dist < 0 || d < dist) {
					dist = d;
					newChasingBH = N;
				}
			}
		}
		this.context.lineWidth = 1;
		if (this.chaseBHInvoked) {
			if (this.chasingBH == newChasingBH) {
				this.chasingBH = -1;
			} else {
				this.chasingBH = newChasingBH;
			}
		}
		this.chaseBHInvoked = false;
	}

	drawXYZVector()
	{
		let offset = {x: 100, y: 60};
		let xy;
		let fieldXYZ = {
			X: {x: 1, y: 0, z: 0},
			Y: {x: 0, y: 1, z: 0},
			Z: {x: 0, y: 0, z: 1}
		};
		// Show XYZ coordinate
		this.context.lineWidth = 2;

		this.context.beginPath();
		this.context.strokeStyle = "red";
		this.context.moveTo(offset.x, offset.y);
		xy = {x: offset.x + 42 * this.camera.view.X.x, y: offset.y + 42 * this.camera.view.X.y};
		this.context.lineTo(xy.x, xy.y);
		xy.x += 7 * this.camera.view.X.x + 7 * this.camera.view.Y.x;
		xy.y += 7 * this.camera.view.X.y + 7 * this.camera.view.Y.y;
		this.context.moveTo(xy.x, xy.y);
		xy.x += -15 * this.camera.view.X.x - 15 * this.camera.view.Y.x;
		xy.y += -15 * this.camera.view.X.y - 15 * this.camera.view.Y.y;
		this.context.lineTo(xy.x, xy.y);
		xy.x += 15 * this.camera.view.X.x;
		xy.y += 15 * this.camera.view.X.y;
		this.context.moveTo(xy.x, xy.y);
		xy.x += -15 * this.camera.view.X.x + 15 * this.camera.view.Y.x;
		xy.y += -15 * this.camera.view.X.y + 15 * this.camera.view.Y.y;
		this.context.lineTo(xy.x, xy.y);
		this.context.stroke();

		this.context.beginPath();
		this.context.strokeStyle = "lime";
		this.context.moveTo(offset.x, offset.y);
		xy = {x: offset.x + 42 * this.camera.view.Y.x, y: offset.y + 42 * this.camera.view.Y.y};
		this.context.lineTo(xy.x, xy.y);
		this.context.lineTo(
		    xy.x + 7 * this.camera.view.Y.x + 7 * this.camera.view.Z.x,
		    xy.y + 7 * this.camera.view.Y.y + 7 * this.camera.view.Z.y);
		this.context.moveTo(xy.x, xy.y);
		this.context.lineTo(
		    xy.x - 7 * this.camera.view.Y.x + 7 * this.camera.view.Z.x,
		    xy.y - 7 * this.camera.view.Y.y + 7 * this.camera.view.Z.y);
		this.context.moveTo(xy.x, xy.y);
		this.context.lineTo(
		    xy.x - 7 * this.camera.view.Z.x,
		    xy.y - 7 * this.camera.view.Z.y);
		this.context.stroke();

		this.context.beginPath();
		this.context.strokeStyle = "blue";
		this.context.moveTo(offset.x, offset.y);
		xy = {x: offset.x + 42 * this.camera.view.Z.x, y: offset.y + 42 * this.camera.view.Z.y};
		this.context.lineTo(xy.x, xy.y);
		xy.x += -7 * this.camera.view.Z.x + 7 * this.camera.view.X.x;
		xy.y += -7 * this.camera.view.Z.y + 7 * this.camera.view.X.y;
		this.context.moveTo(xy.x, xy.y);
		xy.x += 15 * this.camera.view.Z.x;
		xy.y += 15 * this.camera.view.Z.y;
		this.context.lineTo(xy.x, xy.y);
		xy.x += -15 * this.camera.view.Z.x - 15 * this.camera.view.X.x;
		xy.y += -15 * this.camera.view.Z.y - 15 * this.camera.view.X.y;
		this.context.lineTo(xy.x, xy.y);
		xy.x += 15 * this.camera.view.Z.x;
		xy.y += 15 * this.camera.view.Z.y;
		this.context.lineTo(xy.x, xy.y);
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

	mapXYZ2XYZ(x, y, z, XYZ)
	{
		let xy = {x: 0, y: 0};
		xy.x = x * XYZ.X.x + y * XYZ.X.y + z * XYZ.X.z;
		xy.y = x * XYZ.Y.x + y * XYZ.Y.y + z * XYZ.Y.z;
		xy.z = x * XYZ.Z.x + y * XYZ.Z.y + z * XYZ.Z.z;
		return xy;
	}

	calcView(x, y, z, camera)
	{
		let xy = {x: 0, y: 0, z: 0};
		let X = x - camera.pos.x;
		let Y = y - camera.pos.y;
		let Z = z - camera.pos.z;
		xy = this.mapXYZ2XYZ(X, Y, Z, camera.view);
		let z_scaled = this.zScale * xy.z;
		xy.x *= this.camera.F / Math.max(Number.EPSILON, z_scaled);
		xy.y *= this.camera.F / Math.max(Number.EPSILON, z_scaled);
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

	rotate(xyz, y_axis, x_axis_p)
	{
		let ret = {x: 0, y: 0, z: 0};
		ret.x = xyz.x * Math.cos(y_axis) + xyz.z * Math.sin(y_axis);
		ret.z = xyz.z * Math.cos(y_axis) - xyz.x * Math.sin(y_axis);
		ret.y = xyz.y * Math.cos(x_axis_p) - ret.z * Math.sin(x_axis_p);
		ret.z = ret.z * Math.cos(x_axis_p) + xyz.y * Math.sin(x_axis_p);
		return ret;
	}

	// rotate normalized dimension vectors and output rotated vectors with normalizing
	// note: this function do not return any value and modify the first argument
	rotXYZ(XYZ, y_axis, x_axis_p)
	{
		let XYZrotated = {
		    X: null,
		    Y: null,
		    Z: null};
		XYZrotated.X = this.rotate(XYZ.X, y_axis, x_axis_p);
		XYZrotated.Y = this.rotate(XYZ.Y, y_axis, x_axis_p);
		XYZrotated.Z = this.rotate(XYZ.Z, y_axis, x_axis_p);
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

	rotateXYZ(XYZ, y_axis, x_axis_p)
	{
		let RET = {
		    X: {x: 0, y: 0, z: 0},
		    Y: {x: 0, y: 0, z: 0},
		    Z: {x: 0, y: 0, z: 0}};
		RET.X.x = XYZ.X.x * Math.cos(y_axis) + XYZ.Z.x * Math.sin(y_axis);
		RET.X.y = XYZ.X.y * Math.cos(y_axis) + XYZ.Z.y * Math.sin(y_axis);
		RET.X.z = XYZ.X.z * Math.cos(y_axis) + XYZ.Z.z * Math.sin(y_axis);
		RET.Z.x = XYZ.Z.x * Math.cos(y_axis) - XYZ.X.x * Math.sin(y_axis);
		RET.Z.y = XYZ.Z.y * Math.cos(y_axis) - XYZ.X.y * Math.sin(y_axis);
		RET.Z.z = XYZ.Z.z * Math.cos(y_axis) - XYZ.X.z * Math.sin(y_axis);
		RET.Y.x = XYZ.Y.x * Math.cos(x_axis_p) - RET.Z.x * Math.sin(x_axis_p);
		RET.Y.y = XYZ.Y.y * Math.cos(x_axis_p) - RET.Z.y * Math.sin(x_axis_p);
		RET.Y.z = XYZ.Y.z * Math.cos(x_axis_p) - RET.Z.z * Math.sin(x_axis_p);
		RET.Z.x = RET.Z.x * Math.cos(x_axis_p) + XYZ.Y.x * Math.sin(x_axis_p);
		RET.Z.y = RET.Z.y * Math.cos(x_axis_p) + XYZ.Y.y * Math.sin(x_axis_p);
		RET.Z.z = RET.Z.z * Math.cos(x_axis_p) + XYZ.Y.z * Math.sin(x_axis_p);
		return RET;
	}

	// rotate normalized dimension vectors and output rotated vectors with normalizing
	// note: this function do not return any value and modify the first argument
	rotCamera(y_axis, x_axis_p)
	{
		let XYZrotated = {
		    X: null,
		    Y: null,
		    Z: null};
		XYZrotated = this.rotateXYZ(this.camera.view, y_axis, x_axis_p);
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
		// Return
		this.camera.view = XYZrotated;
	}

	moveCamera(x, y, z)
	{
		this.camera.pos.x +=
		    x * this.camera.view.X.x +
		    y * this.camera.view.Y.x +
		    z * this.camera.view.Z.x;
		this.camera.pos.y +=
		    x * this.camera.view.X.y +
		    y * this.camera.view.Y.y +
		    z * this.camera.view.Z.y;
		this.camera.pos.z +=
		    x * this.camera.view.X.z +
		    y * this.camera.view.Y.z +
		    z * this.camera.view.Z.z;

		this.chasingBHDistanceCurrent -= z;
		if (this.chasingBHDistanceCurrent <= this.camera.F) {
			this.chasingBHDistanceCurrent = this.camera.F + 1;
		}
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
			//this.prev_mouse = {clientX: event.clientX, clientY: event.clientY};
			this.prev_mouse = this.pointerPositionDecoder(event);
		} else if (event.type === "touchstart") {
			let touches_current = Array.from(event.touches);
			this.prev_touches = touches_current.map(this.extractTouches, this);
			if (this.touchCounting && event.touches.length == 1) {
				this.touchDblTap(event);
			}
			if (event.touches.length == 1) {
				// Set touchCounting should be at end of event processing
				this.touchCounting = true;
				clearTimeout(this.touchCounter);
				this.touchCounter = setTimeout(function () { root.touchCounting = false; }, 200);
			}
		}
	}

	mouseMove(event)
	{
		event.preventDefault();
		if (event.type === "mousemove") {
			let pointer = this.pointerPositionDecoder(event);
			let move = {x: 0, y: 0};
			move.x = pointer.x - this.prev_mouse.x;
			move.y = pointer.y - this.prev_mouse.y;
			if ((event.buttons & 1) != 0) {
				this.rotCamera(
				    -2.0 * Math.PI * move.x / this.rotDegree,
				    2.0 * Math.PI * move.y / this.rotDegree);
			} else if ((event.buttons & 4) != 0) {
				this.moveCamera(move.x, move.y, 0);
			}
			this.prev_mouse = {x: pointer.x, y: pointer.y};
		} else if (event.type === "touchmove") {
			let touches_current = Array.from(event.touches);
			let move = {x: 0, y: 0};
			if (touches_current.length == 1) {
				let pointer = this.pointerPositionDecoder(touches_current[0]);
				let n = this.prev_touches.findIndex(function (element, index, touches) {
					if (element.identifier == this[0].identifier) {
						return true;
					} else {
						return false;
					}
				    },
				    touches_current);
				if (n >= 0) {
					move.x = pointer.x - this.prev_touches[n].x;
					move.y = pointer.y - this.prev_touches[n].y;
					this.rotCamera(
					    -2.0 * Math.PI * move.x / this.rotDegree,
					    2.0 * Math.PI * move.y / this.rotDegree);
				}
			} else if (touches_current.length == 2 && this.prev_touches.length == 2) {
				let p0 = this.prev_touches[0];
				let p1 = this.prev_touches[1];
				let r0 = this.pointerPositionDecoder(touches_current[0]);
				let r1 = this.pointerPositionDecoder(touches_current[1]);
				move.x = ((r0.x + r1.x) - (p0.x + p1.x)) * 0.5;
				move.y = ((r0.y + r1.y) - (p0.y + p1.y)) * 0.5;
				let dp = Math.sqrt(Math.pow(p0.x - p1.x, 2) + Math.pow(p0.y - p1.y, 2));
				let d = Math.sqrt(Math.pow(r0.x - r1.x, 2) + Math.pow(r0.y - r1.y, 2));
				this.moveCamera(move.x, move.y, d - dp);
			}
			this.prev_touches = touches_current.map(this.extractTouches, this);
		}
	}

	pointerPositionDecoder(pointer)
	{
		let rect = this.rootWindow.getBoundingClientRect();
		let pos = {
			x: pointer.clientX - rect.left,
			y: pointer.clientY - rect.top
		};
		return pos;
	}

	extractTouches(a)
	{
		let pos = this.pointerPositionDecoder(a);
		return {x: pos.x, y: pos.y, identifier: a.identifier};
	}

	wheelMove(event)
	{
		event.preventDefault();
		this.moveCamera(0, 0, -event.deltaY);
	}

	mouseDblClick(event)
	{
		event.preventDefault();
		this.chaseBHInvoked = true;
		this.chasingBHDistanceCurrent = this.chaseBHDistance;
		this.chaseBHClickedPos = this.pointerPositionDecoder(event);
	}

	touchDblTap(event)
	{
		this.chaseBHInvoked = true;
		this.chasingBHDistanceCurrent = this.chaseBHDistance;
		this.chaseBHClickedPos = this.pointerPositionDecoder(event.touches[0]);
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

	startstop()
	{
		if (this.timeClock) {
			clearInterval(this.timeClock);
			this.timeClock = null;
		} else {
			this.startLoop();
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

	switchOverwriting()
	{
		this.overwriting = !this.overwriting;
	}

	switchView3D()
	{
		this.view3D = (this.view3D + 1) % 3;
		switch (this.view3D) {
			case 1:
				this.view3DButton.innerHTML = "3D view switch (cross)";
				this.startstopButton.style.opacity = "0.0";
				this.overwritingButton.style.opacity = "0.0";
				this.particleNumChangerLabel.style.opacity = "0.0";
				this.particleNumChanger.style.opacity = "0.0";
				this.BHNumChangerLabel.style.opacity = "0.0";
				this.BHNumChanger.style.opacity = "0.0";
				break;
			case 2:
				this.view3DButton.innerHTML = "3D view switch (parallel)";
				this.startstopButton.style.opacity = "0.0";
				this.overwritingButton.style.opacity = "0.0";
				this.particleNumChangerLabel.style.opacity = "0.0";
				this.particleNumChanger.style.opacity = "0.0";
				this.BHNumChangerLabel.style.opacity = "0.0";
				this.BHNumChanger.style.opacity = "0.0";
				break;
			default:
				this.view3DButton.innerHTML = "3D view switch (normal)";
				this.startstopButton.style.opacity = "1.0";
				this.overwritingButton.style.opacity = "1.0";
				this.particleNumChangerLabel.style.opacity = "1.0";
				this.particleNumChanger.style.opacity = "1.0";
				this.BHNumChangerLabel.style.opacity = "1.0";
				this.BHNumChanger.style.opacity = "1.0";
		}
	}
}

