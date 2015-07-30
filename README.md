# electron-recompile

## Installation
```bash
$ npm install -g electron-recompile;
```

## Usage
```bash
index [folder] [options]

Options:

  -h, --help              output usage information
  -V, --version           output the version number
  -a, --arch [value]      processor architecture
  -e, --electron [value]  electron version

```

## Example
Recompiled native modules to ```your-project-path/electron-recompiled```
```bash
$ cd your-project-path;
$ npm install electron-prebuilt;
$ electron-recompile;
```
