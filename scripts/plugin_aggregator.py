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
	['no_plugin_hangs', fhr_plugin.total_plugin_hangs],
	['MTBF', fhr_plugin.MTBF]
]

class FHRPluginCrash(MRJob):
	OUTPUT_PROTOCOL = mrjob.protocol.JSONValueProtocol
	#OUTPUT_PROTOCOL = mrjob.protocol.RawValueProtocol
	#OUTPUT_PROTOCOL = CSVProtocol
	HADOOP_INPUT_FORMAT = 'SequenceFileAsTextInputFormat'

	def mapper(self, _, line):
		self.increment_counter('inputs', 'map_volume', 1)
		data_error=False
		try:
			payload = fhr_plugin.parse(line)
		except fhr_plugin.PayloadParseError:
			self.counter('inputs', 'failed_parse', 1)
		if payload:
			try:
				periodic_data = fhr_plugin.organize_data_into_time_periods(payload, resolution='weekly')
			except fhr_plugin.DataMissing as dm:
				self.increment_counter('inputs', 'error-organize-' + dm.value, 1)
				data_error=True
			if not data_error:
				for period in periodic_data:
					facets = []
					values = []
					for (label, fcn) in FACETS: 
						try:                                 
							facets.append((label, fcn(periodic_data[period])))
						except fhr_plugin.DataMissing as dm: 
							self.increment_counter('error', dm.value, 1)
							data_error=True
					for (label, fcn) in VALUES: 
						try:                                  
							values.append((label, fcn(periodic_data[period])))
						except fhr_plugin.DataMissing as dm:  
							self.increment_counter('error', dm.value, 1)
							data_error=True
					if not data_error:
						facets = tuple(facets)
						values = tuple(values)
						#print fhr_plugin.MTBF(periodic_data[period])
						self.increment_counter('map', 'success', 1)
						yield facets, values
					else:
						pass
				if data_error:
					self.increment_counter('inputs', 'data_error', 1)
			else:
				pass
		else:
			self.increment_counter('inputs', 'no_payload', 1)


	def reducer(self, key, data):
		out = {}
		for k in key: out[k[0]] = k[1]
		data = list(data)
		
		actives = len(data)
		
		no_plugin_hangs = len([d for d in data if d[1][1] == 0])
		total_plugin_hangs = sum(d[1][1] for d in data)
		MTFB = [d[2][1] for d in data if d[2][1] != None]
		MTFB.sort()
		if not len(MTFB): MTFB = None
		else: MTFB = MTFB[len(MTFB)/2]

		out['actives']            = actives
		out['no_plugin_hangs']    = no_plugin_hangs
		out['total_plugin_hangs'] = total_plugin_hangs
		out['MTFB'] = MTFB

		yield None, out


if __name__ == '__main__':
	FHRPluginCrash.run()