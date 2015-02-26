/*

MGT.namespace

facets are the keys that we are filtering data sets on.
contexts are just helpers to maintain some global values. For instance, we may want
to switch data sets depending on the context, so all we really need to do is keep track of that on
some sort of global level.

function(data){

	var globals = MGT.namespace();
	globals.add_facets(['os', 'os_version', 'country', 'channel']);
	globals.add_dataset(data, 'plugin-crashesc'); // this data set should have all the facets.
	globals.context('timescale', 'weekly');

	globals.data = MGT.segmenter(data).facets(['os', 'os_version', 'country', 'channel']);
	var new_data = globals.data
					.change_facet('os', 'Windows_NT')
					.filter();
}

*/

var MGT={}

function _get_or_set(thing, key, args){
	if (args.length==0) return thing[key];
	if (args.length==1) return thing[key][args[0]];
	thing[key][args[0]]=this.args[1];
	return thing;
}

MGT.namespace=function(){
	this.contexts = {};
	this._dimensions = {};
	this._facets={};

	this.data_sets = {};

	this.add_facets = function(facets){
		var these_facets = this._facets;
		Object.keys(facets).forEach(function(f){
			these_facets[f] = null;
		});
		return this;
	}

	this.context = function(){
		return _get_or_set(this, 'context', arguments);
	}

	this.facet = function(){
		return _get_or_set(this, '_facets', arguments);
	}

	this.add_dataset = function(data, moniker){
		var own_facets;
		if (arguments.length   == (3)){
			own_facets = arguments[2];
		}
		this.data_sets[moniker] = MGT.segmenter(data);
		if (own_facets) this.data_sets[moniker].add_facets(own_facets);
		else this.data_sets[moniker].add_facets(Object.keys(this._facets));
		return this;
	}

	this.dataset = function(moniker){
		return this.data_sets[moniker];
	}

	return this;
}

MGT.segmenter=function(data){

	this._facets = [];
	var _ = index_data(data);
	this.dims = _.dims;
	this.data = _.data;
	this.current_facets = {};

	this.add_facets = function(){
		var facets;
		if (arguments.length) facets = arguments[0];
		else return this._facets;

		var cf = this.current_facets;

		this._facets = facets;
		this._facets.forEach(function(f){
			cf[f] == null;
		})
		return this;
	}

	this.has_facet = function(key){
		return this.current_facets.hasOwnProperty(key);
	}

	this.facet = function(){
		return _get_or_set(this, 'current_facets', arguments);
	}

	this.set_all_facets = function(s){
		var cf = this.current_facets;
		this._facets.forEach(function(f){
			cf[f] = s;
		})
		return this;
	}

	this.filter = function(){
		var dims = this.dims;
		var cf = this.current_facets;
		this._facets.forEach(function(f){
			dims[f].filterAll();
		});
		Object.keys(this.current_facets).forEach(function(k){
			dims[k].filter(cf[k]);
		});
		var output = dims['actives'].top(Infinity);
		return output;
	}

	return this;
}

function find_all_keys(data){
	var keys=d3.set([]);
	data.forEach(function(d){
		d3.keys(d).forEach(function(ki){keys.add(ki)});
	})
	return keys;
}

function index_data(data){
	var new_data = crossfilter(data);
	var dims = {};
	var keys = find_all_keys(data);
	keys.forEach(function(k){
		dims[k] = new_data.dimension(function(d){return d[k]});
	});
	return {'data': new_data, 'dims': dims};
}


MGT.get_url_params = function(){
    //http://stackoverflow.com/questions/979975/how-to-get-the-value-from-url-parameter
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        // If first entry with this name
        if (pair != '') {
            pair[1] = (pair[1][pair[1].length-1] === '/')
                ? pair[1].slice(0,pair[1].length-1) 
                : pair[1];
        }
        
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = pair[1];
        // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [ query_string[pair[0]], pair[1] ];
            query_string[pair[0]] = arr;
        // If third or later entry with this name
        } else {
            query_string[pair[0]].push(pair[1]);
        }
    }
    return query_string;
}
