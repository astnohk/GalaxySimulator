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

		this.startstopButton = null;

		this.timeClock = null;

		this.canvas = null;
		this.context = null;
		this.scale = 0.5;


		this.cosmoSize = 800;
		this.galaxySize = 200;
		this.galaxyCenterRadius = 75;
		this.r_min = 0.1;
		this.dt = 0.1;
		this.G = 6.67259e-11;

		this.m_BH = 1.0e14;
		this.BHNum = 3;
		this.BH = new Array(this.BHNum);
		this.BH_postmp = new Array(this.BHNum);

		this.m = 1.0;
		this.particleNum = 3000;
		this.particle = new Array(this.particleNum);
		this.particle_postmp = new Array(this.particleNum);


		this.fieldXYZ = {X: {x: 1.0, y: 0.0, z: 0.0}, Y: {x: 0.0, y: 1.0, z: 0.0}, Z: {x: 0.0, y: 0.0, z: 1.0}};
		this.viewOffset = {x: 0, y: 0, z: 0};
		this.displayOffset = {x: 0, y: 0, z: 0};
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
		this.colormap.current = this.colormap.bluesea;
		// Initialize canvas
		this.prepareCanvas();
		// Set event listener
		this.rootWindow.addEventListener("keydown", function (e) { e.currentTarget.rootInstance.keyDown(e); }, false);
		this.rootWindow.addEventListener("wheel", function (e) { e.currentTarget.rootInstance.wheelMove(e); }, false);
		this.startstopButton = document.createElement("div");
		this.startstopButton.rootInstance = this;
		this.startstopButton.innerHTML = "startstop";
		this.startstopButton.id = "GalaxySimulatorStartStopButton";
		this.startstopButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.startstop(e); }, false);
		this.startstopButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.startstop(e); }, false);
		this.rootWindow.appendChild(this.startstopButton);

		// Adjust initial view rotation
		this.rotXYZ(this.fieldXYZ, 0, Math.PI * 120.0 / 180.0);
		// Set root for setInterval

		// Set view offset
		this.viewOffset.x = 0;
		this.viewOffset.y = 0;
		this.viewOffset.z = 0;
		// Set display offset
		this.displayOffset.x = this.canvas.width / 2.0;
		this.displayOffset.y = this.canvas.height / 2.0;

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
			    root.displayOffset.x = e.currentTarget.width / 2.0
			    root.displayOffset.y = e.currentTarget.height / 2.0
		    },
		    false);
		this.canvas.addEventListener("mousedown", function (e) { e.currentTarget.rootInstance.mouseClick(e); }, false);
		this.canvas.addEventListener("mousemove", function (e) { e.currentTarget.rootInstance.mouseMove(e); }, false);
		this.canvas.addEventListener("touchstart", function (e) { e.currentTarget.rootInstance.mouseClick(e); }, false);
		this.canvas.addEventListener("touchmove", function (e) { e.currentTarget.rootInstance.mouseMove(e); }, false);
		this.context = this.canvas.getContext("2d");
		// Initialize canvas size
		let canvasStyle = window.getComputedStyle(this.canvas);
		this.canvas.width = parseInt(canvasStyle.width, 10);
		this.canvas.height = parseInt(canvasStyle.height, 10);
	}

	initGalaxy() {
		let velInitMax = 8;
		let velInitMaxBH = 12;
		let torque = new Array(3);
		for (let N = 0; N < this.BHNum; N++) {
			this.BH[N] = {
				position: {
					x: this.cosmoSize * (Math.random() - 0.5),
					y: this.cosmoSize * (Math.random() - 0.5),
					z: this.cosmoSize * (Math.random() - 0.5)},
				velocity: {
					x: velInitMaxBH * (Math.random() - 0.5),
					y: velInitMaxBH * (Math.random() - 0.5),
					z: velInitMaxBH * (Math.random() - 0.5)}
			    };
			this.BH_postmp[N] = {x: 0.0, y: 0.0, z: 0.0};
			torque[N] = {X: {x: 1.0, y: 0.0, z: 0.0}, Y: {x: 0.0, y: 1.0, z: 0.0}, Z: {x: 0.0, y: 0.0, z: 1.0}};
			this.rotXYZ(
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
					z: p.z + r.z},
				velocity: {
					x: vel * v_norm.x + this.BH[N].velocity.x,
					y: vel * v_norm.y + this.BH[N].velocity.y,
					z: vel * v_norm.z + this.BH[N].velocity.z}
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

	physics()
	{
		for (let n = 0; n < this.particleNum; n++) {
			let f = {x: 0, y: 0, z: 0};
			for (let N = 0; N < this.BHNum; N++) {
				let x = this.BH[N].position.x - this.particle[n].position.x;
				let y = this.BH[N].position.y - this.particle[n].position.y;
				let z = this.BH[N].position.z - this.particle[n].position.z;
				let r = Math.max(this.r_min, x * x + y * y + z * z);
				f.x += x / Math.pow(r, 1.5);
				f.y += y / Math.pow(r, 1.5);
				f.z += z / Math.pow(r, 1.5);
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
				let r = Math.max(this.r_min, x * x + y * y + z * z);
				f.x += x / Math.pow(r, 1.5);
				f.y += y / Math.pow(r, 1.5);
				f.z += z / Math.pow(r, 1.5);
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
		let dc = Math.ceil(255 / (this.colormapQuantize / 2));
		// Make colormap normal
		for (let i = 0; i <= Math.floor(this.colormapQuantize / 2); i++) {
			this.colormap.normal[i] = 'rgb(0,' + Math.min(255, dc * i) + ',' + Math.max(0, 255 - dc * i) + ')';
		}
		for (let i = Math.floor(this.colormapQuantize / 2); i < this.colormapQuantize; i++) {
			this.colormap.normal[i] = 'rgb(' + Math.min(255, dc * i) + ',' + Math.max(0, 255 - dc * i) + ',0)';
		}
		// Make colormap bluesea
		for (let i = 0; i < this.colormapQuantize; i++) {
			this.colormap.bluesea[i] = 'rgb(0,' + Math.min(255, dc * i) + ',255)';
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
		let vel;
		this.context.strokeStyle = 'blue';
		for (let n = 0; n < this.particleNum; n++) {
			vel = 100 * Math.sqrt(
			    this.particle[n].velocity.x * this.particle[n].velocity.x +
			    this.particle[n].velocity.y * this.particle[n].velocity.y +
			    this.particle[n].velocity.z * this.particle[n].velocity.z);
			xy = this.calcView(
			    this.particle[n].position.x,
			    this.particle[n].position.y,
			    this.particle[n].position.z,
			    this.scale,
			    this.viewOffset,
			    this.fieldXYZ);
			this.context.strokeStyle = this.colormap.current[Math.min(this.colormapQuantize, vel)];
			this.context.beginPath();
			this.context.arc(xy.x, xy.y, 1, 0, 2 * Math.PI, false);
			this.context.stroke();
		}
	}

	drawBH()
	{
		let xy = {x: 0, y: 0};
		let vel;
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
			    this.viewOffset,
			    this.fieldXYZ);
			this.context.strokeStyle = 'rgb(255, 0, 0)';
			this.context.beginPath();
			this.context.arc(xy.x, xy.y, 3, 0, 2 * Math.PI, false);
			this.context.stroke();
		}
	}

	drawXYZVector()
	{
		// Show XYZ coordinate
		this.context.lineWidth = 2;
		this.context.beginPath();
		this.context.moveTo(42, 42);
		this.context.strokeStyle = "red";
		this.context.lineTo(42 + 42 * this.fieldXYZ.X.x, 42 + 42 * this.fieldXYZ.X.y);
		let xy = this.calcXYZOnFieldXYZ(-7, -7, 0, this.fieldXYZ);
		this.context.lineTo(42 + 42 * this.fieldXYZ.X.x + xy.x, 42 + 42 * this.fieldXYZ.X.y + xy.y);
		xy = this.calcXYZOnFieldXYZ(-7, 8, 0, this.fieldXYZ);
		this.context.lineTo(42 + 42 * this.fieldXYZ.X.x + xy.x, 42 + 42 * this.fieldXYZ.X.y + xy.y);
		this.context.stroke();
		this.context.beginPath();
		this.context.moveTo(42, 42);
		this.context.strokeStyle = "lime";
		this.context.lineTo(42 + 42 * this.fieldXYZ.Y.x, 42 + 42 * this.fieldXYZ.Y.y);
		xy = this.calcXYZOnFieldXYZ(7, -7, 0, this.fieldXYZ);
		this.context.lineTo(42 + 42 * this.fieldXYZ.Y.x + xy.x, 42 + 42 * this.fieldXYZ.Y.y + xy.y);
		xy = this.calcXYZOnFieldXYZ(-8, -7, 0, this.fieldXYZ);
		this.context.lineTo(42 + 42 * this.fieldXYZ.Y.x + xy.x, 42 + 42 * this.fieldXYZ.Y.y + xy.y);
		this.context.stroke();
		this.context.beginPath();
		this.context.moveTo(42, 42);
		this.context.strokeStyle = "blue";
		this.context.lineTo(42 + 42 * this.fieldXYZ.Z.x, 42 + 42 * this.fieldXYZ.Z.y);
		xy = this.calcXYZOnFieldXYZ(0, 7, -7, this.fieldXYZ);
		this.context.lineTo(42 + 42 * this.fieldXYZ.Z.x + xy.x, 42 + 42 * this.fieldXYZ.Z.y + xy.y);
		xy = this.calcXYZOnFieldXYZ(0, -8, -7, this.fieldXYZ);
		this.context.lineTo(42 + 42 * this.fieldXYZ.Z.x + xy.x, 42 + 42 * this.fieldXYZ.Z.y + xy.y);
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

	calcXYZOnFieldXYZ(x, y, z, fieldXYZ)
	{
		let xy = {x: 0, y: 0};
		xy.x = x * fieldXYZ.X.x + y * fieldXYZ.Y.x + z * fieldXYZ.Z.x;
		xy.y = x * fieldXYZ.X.y + y * fieldXYZ.Y.y + z * fieldXYZ.Z.y;
		return xy;
	}

	calcView(x, y, z, scale, viewOffset, fieldXYZ)
	{
		let xy = {x: 0, y: 0};
		let X = x - this.viewOffset.x;
		let Y = y - this.viewOffset.y;
		let Z = z - this.viewOffset.z;
		xy.x = scale * (X * this.fieldXYZ.X.x + Y * this.fieldXYZ.Y.x + Z * this.fieldXYZ.Z.x) + this.displayOffset.x;
		xy.y = scale * (X * this.fieldXYZ.X.y + Y * this.fieldXYZ.Y.y + Z * this.fieldXYZ.Z.y) + this.displayOffset.y;
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

	rotate(xyz, x, y)
	{
		let ret = {x: 0, y: 0, z: 0};
		ret.x = xyz.x * Math.cos(x) - xyz.z * Math.sin(x);
		ret.z = xyz.z * Math.cos(x) + xyz.x * Math.sin(x);
		ret.y = xyz.y * Math.cos(y) - ret.z * Math.sin(y);
		ret.z = ret.z * Math.cos(y) + xyz.y * Math.sin(y);
		return ret;
	}

	// rotate normalized dimension vectors and output rotated vectors with normalizing
	// note: this function do not return any value and modify the first argument;
	rotXYZ(XYZ, x, y)
	{
		XYZ.X = this.rotate(XYZ.X, x, y);
		XYZ.Y = this.rotate(XYZ.Y, x, y);
		XYZ.Z = this.rotate(XYZ.Z, x, y);
		// Normalize
		XYZ.X = this.normalizeVect(XYZ.X);
		XYZ.Y = this.normalizeVect(XYZ.Y);
		XYZ.Z = this.normalizeVect(XYZ.Z);
		// Reduce residue of Y
		let a = this.innerProductXYZ(XYZ.X, XYZ.Y);
		XYZ.Y.x -= a * XYZ.X.x;
		XYZ.Y.y -= a * XYZ.X.y;
		XYZ.Y.z -= a * XYZ.X.z;
		// Reduce residue of Z
		a = this.innerProductXYZ(XYZ.X, XYZ.Z);
		XYZ.Z.x -= a * XYZ.X.x;
		XYZ.Z.y -= a * XYZ.X.y;
		XYZ.Z.z -= a * XYZ.X.z;
		a = this.innerProductXYZ(XYZ.Y, XYZ.Z);
		XYZ.Z.x -= a * XYZ.Y.x;
		XYZ.Z.y -= a * XYZ.Y.y;
		XYZ.Z.z -= a * XYZ.Y.z;
	}

	// rotate normalized dimension vectors as Z axis moment and output rotated vectors with normalizing
	// note: this function do not return any value and modify the first argument;
	rotXYZOnZ(XYZ, yaw, y)
	{
		let X = {x: 0, y: 0, z: 0};
		let Y = {x: 0, y: 0, z: 0};
		X = XYZ.X;
		Y = XYZ.Y;
		let cos = Math.cos(yaw);
		let sin = Math.sin(yaw);
		if (XYZ.Z.y < 0.0) {
			XYZ.X.x = X.x * cos + Y.x * sin;
			XYZ.X.y = X.y * cos + Y.y * sin;
			XYZ.X.z = X.z * cos + Y.z * sin;
			XYZ.Y.x = Y.x * cos - X.x * sin;
			XYZ.Y.y = Y.y * cos - X.y * sin;
			XYZ.Y.z = Y.z * cos - X.z * sin;
		} else {
			XYZ.X.x = X.x * cos - Y.x * sin;
			XYZ.X.y = X.y * cos - Y.y * sin;
			XYZ.X.z = X.z * cos - Y.z * sin;
			XYZ.Y.x = Y.x * cos + X.x * sin;
			XYZ.Y.y = Y.y * cos + X.y * sin;
			XYZ.Y.z = Y.z * cos + X.z * sin;
		}
		// normalize
		let norm = this.normVect(XYZ.X);
		if (norm > 0.1) {
			XYZ.X.x /= norm;
			XYZ.X.y /= norm;
			XYZ.X.z /= norm;
		}
		// rot with drag on Y axis same as normal rotation
		this.rotXYZ(XYZ, 0, y);
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
		if (event.type === "mousedown") {
			this.prev_clientX = event.clientX;
			this.prev_clientY = event.clientY;
		} else if (event.type === "touchstart") {
			this.prev_clientX = event.touches[0].clientX;
			this.prev_clientY = event.touches[0].clientY;
		}
	}

	mouseMove(event)
	{
		event.preventDefault();
		if (event.type === "mousemove") {
			if ((event.buttons & 1) != 0) {
				this.rotXYZOnZ(this.fieldXYZ,
				    2.0 * Math.PI * (event.clientX - this.prev_clientX) / this.rotDegree,
				    2.0 * Math.PI * (event.clientY - this.prev_clientY) / this.rotDegree);
			} else if ((event.buttons & 4) != 0) {
				let move = {x: 0, y: 0}
				move.x = (event.clientX - this.prev_clientX) / this.scale;
				move.y = (event.clientY - this.prev_clientY) / this.scale;
				this.viewOffset.x -= move.x * this.fieldXYZ.X.x + move.y * this.fieldXYZ.X.y;
				this.viewOffset.y -= move.x * this.fieldXYZ.Y.x + move.y * this.fieldXYZ.Y.y;
				this.viewOffset.z -= move.x * this.fieldXYZ.Z.x + move.y * this.fieldXYZ.Z.y;
			}
			this.prev_clientX = event.clientX;
			this.prev_clientY = event.clientY;
		} else if (event.type === "touchmove") {
			if (event.touches.length == 1) {
				this.rotXYZOnZ(this.fieldXYZ,
				    2.0 * Math.PI * (event.touches[0].clientX - this.prev_clientX) / this.rotDegree,
				    2.0 * Math.PI * (event.touches[0].clientY - this.prev_clientY) / this.rotDegree);
			} else if (event.touches.length == 2) {
				let move = {x: 0, y: 0}
				move.x = (event.touches[0].clientX - this.prev_clientX) / this.scale;
				move.y = (event.touches[0].clientY - this.prev_clientY) / this.scale;
				this.viewOffset.x -= move.x * this.fieldXYZ.X.x + move.y * this.fieldXYZ.X.y;
				this.viewOffset.y -= move.x * this.fieldXYZ.Y.x + move.y * this.fieldXYZ.Y.y;
				this.viewOffset.z -= move.x * this.fieldXYZ.Z.x + move.y * this.fieldXYZ.Z.y;
			}
			this.prev_clientX = event.touches[0].clientX;
			this.prev_clientY = event.touches[0].clientY;
		}
	}

	keyDown(event)
	{
		event.preventDefault();
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
		this.scale = Math.exp(Math.log(this.scale) - event.deltaY * 0.001);
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
}
