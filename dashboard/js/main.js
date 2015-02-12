$(document).ready(function(){

	d3.csv('/data/plugin-weekly.csv', function(data){



		// --------------- transform data for graphing.
		data = MG.convert.date(data, 'date');
		data = data.map(function(d){
			d.hang_percentage = d.plugin_hangs / d.actives;
			return d;
		});


		// --------------- plot the data.
		MG.data_graphic({
			title: 'Percentage of Users without Plugin Hangs'
			target: 'div#no_plugin_hangs',
			data: data,
			x_accessor: 'date',
			y_accessor: 'hang_percentage'
		});

		MG.data_graphic({
			title: 'Mean Time Before Failure'
			target: 'div#mtbf',
			data: data,
			x_accessor: 'date',
			y_accessor: 'mtbf'
		});




	});
})