var fs = require("fs");
var path = require('path');
var packageController = require("package.js");
var NMP = require('nmp');
var nmp = new NMP();

var colors = require('colors');
var child_process = require('child_process');
var options = {
  timeout: (1000*60)*5,
  killSignal: 'SIGKILL'
};




var getElectronVersion = function(rootDirectory) {
	var result = null;

	if (fs.existsSync(path.join(rootDirectory, "node_modules", "electron-prebuilt", "package.json"))){
		result = require(path.join(rootDirectory, "node_modules", "electron-prebuilt", "package.json")).version;
	}

	if (!result){
		console.log(("could not determine electron version from project path " + path.join(rootDirectory, "electron-prebuilt", "package.json") + ". Try --electron to force a version.").red);
		process.exit(1);
	}
	return result;
}


var Batch = function(){
	this.script = [];
	return this;
}

Batch.prototype.execute = function(module) {
	var done;
	for (var i = 0; i < this.script.length; i++) {
		var script = this.script[i];
		done = false
		var color = script.color || colors.cyan;
		console.log(color(script.cmd));
		try{
			child_process.execSync(script.cmd, script.options);
			done = true;
		} catch(e){
			console.log(colors.red("Failed to compile : " + module.meta.name));
			console.log(colors.red(e));
			break;
		}
	}
	return done;
};


var processModule = function(module) {
	var fn = path.join(module.dir, "binding.gyp");
	if (fs.existsSync(fn) && module.meta && module.meta.repository && module.meta.repository.url){
		console.log("compile".magenta, module.meta.name.green);
		var repoUrl = module.meta.repository.url;
		if (repoUrl.indexOf("+") !== -1){
			repoUrl = repoUrl.split("+")[1];
		}

		var tmp = path.join(__dirname, "..", "tmp", module.meta.name + "@" + module.meta.version);
		var electronGypHome = "electron-gyp"; //path.join(__dirname, "..", "tmp", "electron-gyp" + "@" + electronVersion);
		var cmd;
		var batch = new Batch();

		if (fs.existsSync(tmp)){
			cmd = "rd /S /Q " + tmp;
			batch.script.push({cmd:cmd});
			/*console.log(cmd);
			child_process.execSync(cmd);*/
			// execute(cmd, true);
		}


		cmd = 'git clone --depth=1 ' + repoUrl + ' ' + tmp;
		batch.script.push({cmd:cmd});

		cmd = "cd " + tmp + " && npm install";
		batch.script.push({cmd:cmd});

		/*cmd = "cd " + tmp + " && npm run prepublish";
		batch.script.push({cmd:cmd});*/

		/*cmd = "cd " + tmp + " && node-gyp configure";
		batch.script.push({cmd:cmd});*/

		cmd = 'cd ' + tmp + ' && set HOME=' + electronGypHome + ' && node-gyp rebuild --target=' + module.config.electronVersion + ' --arch=' + module.config.arch + ' --dist-url=https://atom.io/download/atom-shell';
		batch.script.push({cmd:cmd});

		var targetOut = path.join(module.dir, "bin", nmp.versionString()); //path.join(rootDirectory, "..", "electron-recompiled", "electron-v" + electronVersion + "_" + arch + "_" + this.meta.name + "-v" + this.meta.version);
		if (!fs.existsSync(targetOut)){
			cmd = 'mkdir ' + targetOut;
			batch.script.push({cmd:cmd});
		}

		cmd = 'cd ' + path.join(tmp, "build", "release") + ' && cp -f *.node ' + targetOut;
		batch.script.push({cmd:cmd, color:colors.green});

		batch.execute(module);
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