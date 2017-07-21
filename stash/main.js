window.addEventListener("load", initSystem, false);

var SystemRoot;
var GalaxySimulatorWindow;
var GalaxySimulatorApplication;

function
initSystem()
{
	SystemRoot = new ECMASystem(document.body);

	GalaxySimulatorWindow = SystemRoot.createWindow({id: "GalaxySimulator", noCloseButton: null});
	GalaxySimulatorWindow.style.position = "absolute";
	GalaxySimulatorWindow.style.top = "0px";
	GalaxySimulatorWindow.style.left = "0px";
	GalaxySimulatorWindow.style.width = "100%";
	GalaxySimulatorWindow.style.height = "100%";
	document.body.appendChild(GalaxySimulatorWindow);

	GalaxySimulatorApplication = new GalaxySimulator(SystemRoot, GalaxySimulatorWindow);
}

