
var fs = require("fs");
var path = require("path");
var recompiler = require("./recompiler.js");


var program = require('commander');

program
  .version('0.0.1')
  .option('-a, --arch [value]', 'processor architecture')
  .option('-e, --electron [value]', 'electron version')
  .parse(process.argv);


var directory = path.join((process.argv[2] ? process.argv[2] : process.cwd()));
console.log("asdsd", directory);
fs.exists(directory, function(exists){
	debugger;
	var config = {}
	config.arch = (program.arch || process.arch);
	if (exists){
		config.dir = directory;
		config.electronVersion = (program.electron || recompiler.getElectronVersion(directory));
		recompiler.run(config);
	} else {
		directory = path.resolve(process.cwd(), process.argv[2], "node_modules");
		fs.exists(directory, function(exsts){
			if (exsts){
				config.dir = directory;
				config.electronVersion = (program.electron || recompiler.getElectronVersion(directory));
				recompiler.run(directory);
			}
		});
	}
});
