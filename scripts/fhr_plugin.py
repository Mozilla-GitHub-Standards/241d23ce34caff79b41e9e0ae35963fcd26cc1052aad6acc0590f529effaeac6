import json
from datetime import datetime, date, timedelta
import copy

def PayloadParseError(Exception): pass
class DataMissing(Exception): 
	def __init__(self, v):
		self.value = v

def parse(payload):
	try:
		data = json.loads(payload)
	except PayloadParseError, e:
		raise e



def has_data(data):
	if 'data' in data:
		if 'days' in data['data']: return True
	return False

def days(data):
	return data['data']['days']

#################################
#   AFTER THE PROCESSING
#################################

def release_channel(processed_data):
	return processed_data['environment']['org.mozilla.appInfo.appinfo']['updateChannel']

def OS(processed_data):
	try:
		return processed_data['environment']['org.mozilla.sysinfo.sysinfo']['name']
	except:
		raise DataMissing('os-version')

def OS_version(processed_data):
	try:
		return processed_data['environment']['org.mozilla.sysinfo.sysinfo']['version']
	except:
		raise DataMissing('os-version')

def total_plugin_hangs(processed_data):
	total=0
	for day in processed_data['data']:
		this_day = processed_data['data'][day]
		if 'org.mozilla.crashes.crashes' in this_day:
			if 'plugin-hang' in this_day['org.mozilla.crashes.crashes']:
				total += this_day['org.mozilla.crashes.crashes']['plugin-hang']
	return total

def total_session_time(processed_data):
	total=0
	for day in processed_data['data']:
		this_day = processed_data['data'][day]
		if 'org.mozilla.appSessions.previous' in this_day:
			sessions = this_day['org.mozilla.appSessions.previous']
			if 'cleanActiveTicks'  in sessions: total += sum(sessions['cleanActiveTicks'])*5
			if 'cleanAbortedTicks' in sessions: total += sum(sessions['cleanAbortedTicks'])*5
			if 'cleanTotalTime'    in sessions: total += sum(sessions['cleanTotalTime'])
			if 'abortedTotalTime'  in sessions: total += sum(sessions['abortedTotalTime'])
	return total

def was_active(processed_data):
	for day in processed_data['data']:
		if 'org.mozilla.appSessions.previous' in processed_data['data']: return True
	return False
		
def country_code(processed_data):
	return processed_data['environment']['country_code']

FACETS = [
	['country', fhr_plugin.country],
	['release_channel', fhr_plugin.release_channel],
	['windows_os_version', fhr_plugin.os_version],
	['date', partial(fhr_plugin.date, resolution='weekly')]
]


# copy everything in last that is relevant
# for each day, give all the relevant data:
#		all the keys on the topmost level

def organize_data_into_time_periods(data, resolution='weekly'):
	'''This function mutates the FHR payload into a workable periods per payload. 

	The returned object can be iterated over, and the other functions

	For instance, if I want to set up an FHR payload to answer questions on a weekly
	level, I would need to organize all the date-based measurement data in terms of weeks.

	'''
	matched = {}
	default_environment = data['data']['last']
	_country = country(data)
	if not has_data(data): raise DataMissing('data.days')

	days = days(data)
	for day in days:
		this_day = days[day]
		try:
			computed_date = datetime.strptime(day, '%Y-%m-%d').date()
		except:
			raise DataMissing('computed_date')

		if time_horizon=='daily':
			fr = timedelta(days=0)
			to = fr
		if time_horizon=='weekly':
			fr = computed_date - timedelta(days=computed_date.weekday())
			to = fr + timedelta(days=6)
		if time_horizon=='monthly':
			fr = computed_date - timedelta(days=computed_date.day-1)
			to = fr + timedelta(days=31)
			to = to - timedelta(days=to.day) + timedelta(days=1)

		if fr not in matched:                        matched[fr]                       = {}
		if 'environment' not in matched[fr]:         matched[fr]['environment']        = copy.deepcopy(default_environment)
		if 'country_code' not in matched[fr]['environment']:  matched[fr]['environment']['country_code'] = _country
		if 'data'       not in matched[fr]:          matched[fr]['data']               = []
		matched[fr]['data'].append(days[day])
	return matched
