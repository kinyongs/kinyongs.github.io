import{Engine}from'../Engine.js';
export class PluginLoader{static load(plugin,options){if(!plugin?.install||!plugin?.initialize)throw Error('Invalid domain plugin');const e=new Engine(plugin,options);e.init();return e}}
