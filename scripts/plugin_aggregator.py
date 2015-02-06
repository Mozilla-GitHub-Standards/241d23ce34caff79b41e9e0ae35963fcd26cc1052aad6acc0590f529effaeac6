import mrjob
from mrjob.job import MRJob
import sys
import fhr_plugin
from pprint import pprint
from functools import partial
import itertools
import optparse

FACETS = [
	['country', fhr_plugin.country],
	['release_channel', fhr_plugin.release_channel],
	['windows_os_version', fhr_plugin.os_version],
	['date', partial(fhr_plugin.date, resolution='weekly')]
]
#### the key name       the function that pulls in map        the function that aggregates in reduce
VALUES = [ 
	['never_crashed', fhr_plugin.never_crashed],
	['MTBF', fhr_plugin.mtbf]
]

class FHRPluginCrash(MRJob):
	OUTPUT_PROTOCOL = mrjob.protocol.JSONProtocol
	#OUTPUT_PROTOCOL = CSVProtocol
	HADOOP_INPUT_FORMAT = 'SequenceFileAsTextInputFormat'

	def mapper(self, _, line):
		self.increment_counter('inputs', 'map_volume', 1)
		try:
			payload = fhr_plugin.parse(line)
		except fhr_plugin.PayloadParseError:
			self.counter('inputs', 'failed_parse', 1)
		



	def reducer(self, key, data):
		pass




class FHRPluginCrash(MRJob):
	OUTPUT_PROTOCOL = mrjob.protocol.JSONProtocol
	#OUTPUT_PROTOCOL = CSVProtocol
	HADOOP_INPUT_FORMAT = 'SequenceFileAsTextInputFormat'

	# def configure_options(self):
	# 	super(FHRPluginCrash, self).configure_options()
	# 	self.add_passthrough_option(
	# 		'--resolution', default='monthly', choices=['daily', 'weekly', 'monthly'],
	# 		help="Specify the time horizon for your job")

	def mapper(self, _, line):
		keep_going = True
		self.increment_counter('output', 'potential_map_volume', 1)
		try:
			record = fennec.parse(line)
		except ValueError:
			self.increment_counter('error', 'payload_parse_error', 1)
			self.increment_counter('output', 'dropped', 1)
			keep_going = False
			return
		except:
			self.increment_counter('error', 'other_error', 1)

		try:
			days = fennec.get_nice_days(record, time_horizon=self.options.resolution)
		except fennec.DataMissing as dm:
			days = None
			self.increment_counter('data-failure', 'days_' + dm.value, 1)
		if days:
			data_error = False
			
			apply_items = list(itertools.chain(*[the_keys, [[d[0], d[1]] for d in the_values]]))
			for d in days:
				this_day = days[d]
				this_day['pulled'] = {}
				for (k, fn) in apply_items:
					try:
						this_day['pulled'][k] = fn(days[d])
						self.increment_counter('data-success', k, 1)
					except fennec.DataMissing as dm:
						self.increment_counter('data-failure', dm.value, 1)
						data_error = True
		else:
			data_error=True
		if not data_error:
			days = days.items()
			self.increment_counter('output', 'mapped', 1)
			for (d, c) in days:
				c = c['pulled']
				out_key   = tuple([c[k[0]] for k in the_keys])
				out_value = tuple([c[v[0]] for v in the_values])
				yield out_key, out_value
			#
		else:
			self.increment_counter('output', 'data_error', 1)

	def reducer(self, key, data):
		data = list(data)

		reduced = [[d[0], d[2](data)] for d in the_values]
		
		self.increment_counter('reduce', 'made_it', 1)
		if reduced[1][1]: # IF TOTAL ACTIVE
			out = dict(zip([d[0] for d in the_keys], key))
			for (v,q) in reduced: 
				out[v] = q
			yield None, out



if __name__ == '__main__':
	FennecRollup.run()