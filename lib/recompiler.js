var fs = require("fs");
var path = require('path');
var packageController = require("package.js");
var NMP = require('nmp');
var nmp = new NMP();

require('colors');
var child_process = require('child_process');
var options = {
  timeout: (1000*60)*3,
  killSignal: 'SIGKILL'
};




var getElectronVersion = function(rootDirectory) {
	var result = null;

	if (fs.existsSync(path.join(rootDirectory, "electron-prebuilt", "package.json"))){
		result = require(path.join(rootDirectory, "electron-prebuilt", "package.json")).version;
	}

	if (!result){
		console.log(("could not determine electron version from project path " + path.join(rootDirectory, "electron-prebuilt", "package.json") + ". Try --electron to force a version.").red);
		process.exit(1);
	}
	return result;
}


var processModule = function(module) {
	var fn = path.join(module.dir, "binding.gyp");
	if (fs.existsSync(fn)){
		var repoUrl = module.meta.repository.url;
		if (repoUrl.indexOf("+") !== -1){
			repoUrl = repoUrl.split("+")[1];
		}

		var tmp = path.join(__dirname, "..", "tmp", module.meta.name + "@" + module.meta.version);
		var electronGypHome = "electron-gyp"; //path.join(__dirname, "..", "tmp", "electron-gyp" + "@" + electronVersion);

		if (fs.existsSync(tmp)){
			var cmd = "rd /S /Q " + tmp;
			console.log(cmd);
			child_process.execSync(cmd);
			// execute(cmd, true);
		}

		cmd = 'git clone --depth=1 ' + repoUrl + ' ' + tmp;
		console.log(cmd);
		child_process.execSync(cmd);
		// execute(cmd);

		cmd = "cd " + tmp + " && npm install";
		console.log(cmd.cyan);
		child_process.execSync(cmd, options);

		cmd = 'cd ' + tmp + ' && set HOME=' + electronGypHome + ' && node-gyp rebuild --target=' + module.config.electronVersion + ' --arch=' + module.config.arch + ' --dist-url=https://atom.io/download/atom-shell';
		console.log(cmd);
		child_process.execSync(cmd);
		//execute(cmd);

		var targetOut = path.join(module.dir, "bin", nmp.versionString()); //path.join(rootDirectory, "..", "electron-recompiled", "electron-v" + electronVersion + "_" + arch + "_" + this.meta.name + "-v" + this.meta.version);
		if (!fs.existsSync(targetOut)){
			cmd = 'mkdir ' + targetOut;
			console.log(cmd);
			child_process.execSync(cmd);
		}
		//execute(cmd, true);

		cmd = 'cd ' + path.join(tmp, "build", "release") + ' && cp -f *.node ' + targetOut;
		console.log(cmd.cyan);
		child_process.execSync(cmd);
		//execute(cmd);
	}
	return false;
};

var run = function(config) {
	if (!config.arch){
		config.arch = process.arch;
	}
	if (!config.electronVersion){
		config.electronVersion = process.versions.electron;
	}

	console.log("recompiling native modules in", config.dir.green, "processor:".magenta, config.arch.cyan, "electron:".magenta, config.electronVersion.cyan, "v8:".magenta, process.versions.v8.cyan);

	packageController.autoload({
		debug: true,
		directoryScanLevel: 200,
		identify: function  () {
			this.config = config;
			return processModule(this);
		},
		directories: [config.dir],
		packageContstructorSettings: {}
	});
};


module.exports = {
	run:run,
	getElectronVersion:getElectronVersion
}