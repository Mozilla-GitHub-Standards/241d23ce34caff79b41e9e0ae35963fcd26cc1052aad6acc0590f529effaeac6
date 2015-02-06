import mrjob
from mrjob.job import MRJob
import sys
import fhr_plugin
from pprint import pprint
from functools import partial
import itertools
import optparse

FACETS = [
	['country', fhr_plugin.country_code],
	['release_channel', fhr_plugin.release_channel],
	['os', fhr_plugin.OS],
	['os_version', fhr_plugin.OS_version],
	['date', fhr_plugin.date]
]

VALUES = [
	['active', fhr_plugin.was_active],
	['no_plugin_hangs', fhr_plugin.plugin_hangs],
	['MTBF', fhr_plugin.MTBF]
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
		periodic_data = fhr_plugin.organize_data_into_time_periods(payload, resolution='weekly')
		for period in periodic_data:
			facets = []
			values = []
			for (label, fcn) in FACETS: facets.append((label, fcn(period)))
			for (label, fcn) in VALUES: values.append((label, fcn(period)))
			facets = tuple(facets)
			values = tuple(values)
			yield facets, values


	def reducer(self, key, data):
		out = {}
		for k in key: out[k] = key[k]
		data = list(data)
		actives = len(data)
		no_plugin_hangs = len(d for d in data if d[1][1]==0)
		MTFB = [d[2][1] for d in data if d[2][1] != None]
		MTFB.sort()
		MTFB = MTFB[len(MTFB)/2]
		out['actives'] = actives
		out['no_plugin_hangs'] = no_plugin_hangs
		out['MTFB'] = MTFB
		yield None, out


if __name__ == '__main__':
	FHRPluginCrash.run()