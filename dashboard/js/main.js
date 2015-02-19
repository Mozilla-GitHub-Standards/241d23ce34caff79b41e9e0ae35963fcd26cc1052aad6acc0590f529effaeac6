'use strict';

var global     = {};
global.first_load_complete=false;
global.data = {};
global.facets = {};
global.facets.os            = 'all';
global.facets.os_version    = 'all';
global.facets.country           = 'all';
global.facets.channel       = 'all';
global.facets.timescale    = 'weekly';
global.feature_set = {};

global.facet_keys = {};
global.facet_keys.os = {};
global.facet_keys.os_version = {};
global.facet_keys.country = {};
global.facet_keys.channel = {};
global.facet_keys.timescale = {'weekly':'weekly', 'monthly':'monthly'};

var torso = {};
torso.width = 375;
torso.height = 200;
torso.right = 20;

var trunk = {};
trunk.width = 320;
trunk.height = 150;
trunk.left = 40;
trunk.right = 10;

function areWeSettingOptionsOnFirstLoad(url_params){
    var facets = Object.keys(global.facets);
    var this_facet;
    var gs = {};
    for (var i=0; i<facets.length;i++){
        this_facet = facets[i];
        if (!url_params.hasOwnProperty(this_facet)) return;
        global.facets[this_facet] = url_params[this_facet] == undefined ? (this_facet == 'timescale' ? 'weekly' : 'all') : global.facet_keys[this_facet][url_params[this_facet]];//  url_params[this_facet];
        $('.'+this_facet+'-btns button.btn span.title').html(global.facet_keys[this_facet][url_params[this_facet]]);
    }
    $('.aaahhh .alert').fadeOut();
    updatePermalink();
}

function updatePermalink() {
    var updated_url = '';
    var facets = Object.keys(global.facets);
    var this_facet;
    var which_char;
    for (var i=0;i<facets.length; i++){
        this_facet = facets[i];
        if (i==0) which_char = '?';
        else which_char = '&';
        updated_url += which_char + this_facet + '=' + strip_punctuation(global.facets[this_facet]);
    }
    $('.permalink a').attr('href', updated_url);
}    

function multiply_up(data,k){
    data = data.map(function(d){
        d[k] = d[k] * global.sample_multiplier;
        return d;
    })
    return data;
}



function nicify(set_items, item_ugly) {
    return (set_items[item_ugly] == undefined)
        ? item_ugly
        : set_items[item_ugly];
}

function update_and_replot(category, feature){
    $('.aaahhh .alert').fadeOut();
    global.facets[category] = feature;
    if (category == 'os' && feature !='Windows_NT'){
        $('div.os_version-btns button').prop('disabled', true);
    } else {
        $('div.os_version-btns button').prop('disabled', false);
    }
    global.data.change_facet(category, feature);
    plot_data();
    updatePermalink();
}

function cut_data(){
    return global.data.filter();
}

function plot_data(_data){
    var data = cut_data();
    data = data.filter(function(d){
        return d.date > new Date('2014-09-15') && d.date < new Date('2015-02-04');
    });

    var first_date = d3.min(data, function(d){
        return d.date;
    });
    MG.data_graphic({
            title: "Percentage of Records without Plugin Hangs",
            description: "The percentage of FHR records without any plugin hangs at all.",
            data: data,
            markers: global.releases,
            width: torso.width,
            height: torso.height,
            format: "Percentage",
            right: torso.right,
            xax_format: xax_formatter,
            target: 'div#no-plugin-hangs',
            x_accessor: 'date',
            y_accessor: 'no_hang_perc',
    });
    MG.data_graphic({
        title: "Plugin Hangs Per 100 Records",
        description: "The number of plugin hangs per 100 FHR records.",
        data: data,
        markers: global.releases,
        width: torso.width,
        height: torso.height,
        right: torso.right,
        xax_format: xax_formatter,
        target: 'div#hangs-per-record',
        x_accessor: 'date',
        y_accessor: 'hangs_per_record',
    });
    MG.data_graphic({
        title: "Plugin Hangs Per Haver-Of-Hangs",
        description: "The number of plugin hangs per hang-haver. If a record had no plugin hang, it is not counted here.",
        data: data,
        markers: global.releases,
        width: torso.width,
        height: torso.height,
        right: torso.right,
        xax_format: xax_formatter,
        target: 'div#per_haver',
        x_accessor: 'date',
        y_accessor: 'per_haver',
    });
    MG.data_graphic({
        title: "Mean Time Between Failures (in hours)",
        description: "The number of records each week with some form of browsing activity.",
        data: data,
        markers: global.releases,
        width: torso.width,
        height: torso.height,
        right: torso.right,
        xax_format: xax_formatter,
        target: 'div#mtbf',
        x_accessor: 'date',
        y_accessor: 'mtbf',
    });
}

var xax_formatter = function(d) {
    var df = d3.time.format('%b');
    var pf = d3.formatPrefix(d);

    // format as date or not, of course user can pass in 
    // a custom function if desired
    return (this.x_accessor == 'date') 
        ? df(d)
        : pf.scale(d) + pf.symbol;
}

function compare_but_not_other(a,b){
    if (a=='other' || a=='Other'){
        return 1;
    }
    if (b=='other' || b=='Other'){
        return -1;
    }
    if (a>b) return 1;
    if (b>a) return -1;
    return 0;

}

function strip_punctuation(s){
    s = String(s);
    var punctuationless = s.replace(/[^a-zA-Z0-9 _]+/g, '');
    var finalString = punctuationless.replace(/ +?/g, "");
    return finalString;
}

function isEmpty(object) { for(var i in object) { return true; } return false; }


function load_and_prep_data(){
    // set time scale before loading data, since it is dependent on it.
    
    var params = MGT.get_url_params();
    //if neither the global timescale nor the param time scale are set, use the default
    if(global.facets.timescale == '' 
            && params['timescale'] == undefined) {
        global.facets.timescale = 'weekly';
    }
    //if the global time scale is not set, use the param
    else if(global.facets.timescale == '') {
        global.facets.timescale = params['timescale'];
    }
    var ts = global.facets.timescale;

    d3.csv('data/plugin-hangs.csv', function(data){
        
        data = prep_data(data);

        if (!global.first_load_complete){
            global.buttons = MG.button_layout('div.links-and-buttons')
                .data(data)
                .button('os', 'OS', compare_but_not_other)
                .button('os_version', 'OS Version', compare_but_not_other)
                .button('country', 'Country', compare_but_not_other)
                .button('channel', 'Channel', compare_but_not_other)
                .callback(update_and_replot)
                .display();
            //
            $(".geo-btns ul li a")
                .html(function(i,d) {
                    return nicify(global.nice_country, d);
            });
            
            $(".channel-btns ul li a")
                .html(function(i,d) {
                    return nicify(global.nice_channel, d);
            });
        }
        // turn off button for 'all' setting to start.
        $('div.os_version-btns button').prop('disabled', true);

        global.data = MGT.segmenter(data).facets(['os', 'os_version', 'country', 'channel']).set_all_facets('all');

        if (!global.first_load_complete){
            var url_params = MGT.get_url_params();
            areWeSettingOptionsOnFirstLoad(url_params);    
        }
        
        plot_data();
        global.first_date = d3.min(data, function(d){
                return d.date;
        });
        global.last_date = d3.max(data, function(d){
            return d.date;
        });

        global.first_load_complete=true;
    });
}

function uniq(data, accessor){
    var s = d3.set([]);
    data.forEach(function(d){
        s.add(d[accessor]);
    });
    return s;
}

function prep_data(data){
    data = MG.convert.date(data, 'date');
    data = MG.convert.number(data, 'actives');
    data = MG.convert.number(data, 'no_hangs');
    data = MG.convert.number(data, 'total_hangs');
    data = data.map(function(d){
        if (d.mtbf=='null') {
            d.mtbf=0;
        } else {
            d.mtbf = parseInt(d.mtbf) / 60. / 60.
        }
        return d;
    });
    //data = MG.convert.number(data, 'mtbf');
    data.forEach(function(d){
        var dnh = d.actives - d.no_hangs;
        d.no_hang_perc = d.no_hangs / (d.actives);
        d.hangs_per_record = d.total_hangs / d.actives*100;//d.total_hangs / (d.actives - d.no_hangs);
        d.per_haver = d.total_hangs / (d.actives - d.no_hangs);
        if (isNaN(d.per_haver)){
            d.per_haver = 0;
        }
    });
    var facets = Object.keys(global.facets);
    var this_facet, all_values;
    if (isEmpty(global.facet_keys)){
        for (var i=0; i < facets.length; i++){
            this_facet = facets[i];
            if (this_facet !='timescale'){
                all_values = uniq(data, this_facet).values();
                for (var j=0; j < all_values.length; j++){
                    global.facet_keys[this_facet][strip_punctuation(all_values[j])] = all_values[j];
                }
                
            }
        }   
    }
    return data;
}



function prettyDate(date){
    var diff = (((new Date()).getTime() - date.getTime()) / 1000),
        day_diff = Math.floor(diff / 86400);
            
    if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
        return;
            
    return day_diff == 0 && (
            diff < 60 && "just now" ||
            diff < 120 && "1 minute ago" ||
            diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
            diff < 7200 && "1 hour ago" ||
            diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
        day_diff == 1 && "Yesterday" ||
        day_diff < 7 && day_diff + " days ago" ||
        day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

// If jQuery is included in the page, adds a jQuery plugin to handle it as well
if ( typeof jQuery != "undefined" )
    jQuery.fn.prettyDate = function(){
        return this.each(function(){
            var date = prettyDate(this.title);
            if ( date )
                jQuery(this).text( date );
        });
    };

$(document).ready(function() {
    global.insufficient_data_threshold = 500;
    global.min_data_length = 5;
    global.nice_country = {
        'US': 'USA',
        'CA': 'Canada',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'FR': 'France',
        'ES': 'Spain',
        'IT': 'Italy',
        'PL': 'Poland',
        'TR': 'Turkey',
        'RU': 'Russia',
        'DE': 'Germany',
        'IN': 'India',
        'ID': 'Indonesia',
        'CN': 'China',
        'JP': 'Japan',
        'GB': 'United Kingdom'
    }
    global.nice_channel = {
        'nightly': 'Nightly',
        'release': 'Release',
        'aurora': 'Aurora',
        'beta': 'Beta'
    }
    global.nice_os = {
        'Windows_NT': 'Windows NT',
        'Linux': 'Linux',
        'Darwin': 'Mac OS',
        'Windows_95': 'Windows 95',
        'Windows_98': 'Windows 98',
        'SphinUX': 'SphinUX',
        'SunOS': 'Sun OS',
        'missing': 'Missing'
    }
    
    var url_params = MGT.get_url_params();

    d3.json('data/firefox_releases.json', function(releases){
        var releases = releases['releases']
            .map(function(d,i){
                d['date'] = new Date(d['date']);
                d['label'] = d['version'];
                return d;
            })
            .filter(function(d,i){
                return d['date'] > new Date('2013-12-31');
            });

        global.releases = releases;
        load_and_prep_data();
    })
})