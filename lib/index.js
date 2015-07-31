#!/usr/bin/env node
var fs = require("fs");
var path = require('path');
var shell = require('shelljs');
var packageController = require("package.js");
var NMP = require('nmp');
var nmp = new NMP();

require('colors');
var child_process = require('child_process');
var options = {
  timeout: 1000*60,
  killSignal: 'SIGKILL'
};


var program = require('commander');
var rootDirectory;
var arch;
var electronVersion;

program
  .version('0.0.1')
  .option('-a, --arch [value]', 'processor architecture')
  .option('-e, --electron [value]', 'electron version')
  .parse(process.argv);


var getElectronVersion = function() {
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




var execute = function(cmd, tryIt) {
	console.log(cmd.underline.cyan);
	if (shell.exec(cmd).code !== 0){
		if (tryIt){
			console.log("command failed:".yellow, cmd.yellow);
		} else {
			console.log("command failed:".red, cmd.red);
			process.exit(1);
		}
	}
}

var processModule = function() {
	var fn = path.join(this.dir, "binding.gyp");
	if (fs.existsSync(fn)){
		var repoUrl = this.meta.repository.url;
		if (repoUrl.indexOf("+") !== -1){
			repoUrl = repoUrl.split("+")[1];
		}

		var tmp = path.join(__dirname, "..", "tmp", this.meta.name + "@" + this.meta.version);
		var electronGypHome = "electron-gyp"; //path.join(__dirname, "..", "tmp", "electron-gyp" + "@" + electronVersion);

		var cmd = "rd /S /Q " + tmp;
		execute(cmd, true);

		cmd = 'git clone --depth=1 ' + repoUrl + ' ' + tmp;
		execute(cmd);

		cmd = "cd " + tmp + " && npm install";
		console.log(cmd.cyan);
		child_process.execSync(cmd, options);

		cmd = 'cd ' + tmp + ' && set HOME=' + electronGypHome + ' && node-gyp rebuild --target=' + electronVersion + ' --arch=' + arch + ' --dist-url=https://atom.io/download/atom-shell';
		execute(cmd);


		var targetOut = path.join(this.dir, "bin", nmp.versionString()); //path.join(rootDirectory, "..", "electron-recompiled", "electron-v" + electronVersion + "_" + arch + "_" + this.meta.name + "-v" + this.meta.version);
		cmd = 'mkdir ' + targetOut;
		execute(cmd, true);

		cmd = 'cd ' + path.join(tmp, "build", "release") + ' && cp -f *.node ' + targetOut;
		execute(cmd);
	}
	return false;
};

var run = function(dir) {
	rootDirectory = dir;
	arch = (program.arch || process.arch);
	electronVersion = (program.electron || getElectronVersion());

	console.log("recompiling native modules in", dir.green, "processor:".magenta, arch.cyan, "electron:".magenta, electronVersion.cyan);

	packageController.autoload({
		debug: true,
		directoryScanLevel: 200,
		identify: processModule,
		directories: [dir],
		packageContstructorSettings: {}
	});
};


var directory = path.join((process.argv[2] ? process.argv[2] : process.cwd()), "node_modules");
fs.exists(directory, function(exists){
	if (exists){
		run(directory);
	} else {
		directory = path.resolve(process.cwd(), process.argv[2], "node_modules");
		fs.exists(directory, function(exsts){
			if (exsts){
				run(directory);
			}
		});
	}
});
