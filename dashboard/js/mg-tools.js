/*

function(data){
	globals.data = MGT.segmenter(data).facets(['os', 'os_version', 'country', 'channel']);
	var new_data = globals.data
					.change_facet('os', 'Windows_NT')
					.filter();
}

*/

var MGT={}

MGT.segmenter=function(data){
	this._facets = [];
	var _ = index_data(data);
	this.dims = _.dims;
	this.data = _.data;
	this.current_facets = {};

	this.facets = function(){
		var facets;
		var cf = this.current_facets;
		if (arguments.length) facets = arguments[0];
		else {
			return this._facets;
		} 
		this._facets = facets;
		this._facets.forEach(function(f){
			cf[f] == 'all';
		})
		return this;
	}

	this.change_facet = function(key, value){
		this.current_facets[key] = value;
		console.log(this.current_facets);
		return this;
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
