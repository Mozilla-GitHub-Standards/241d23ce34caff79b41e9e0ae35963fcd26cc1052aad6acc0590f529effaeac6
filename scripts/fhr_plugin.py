import json
from datetime import datetime, date, timedelta
import copy
import cPickle
from pprint import pprint
import sys

COUNTRIES = set(['US','CA','BR','MX','FR','ES','IT','PL','TR','RU','DE','IN','ID','CN','JP','GB'])
CHANNELS = set(['release', 'beta', 'aurora', 'nightly', 'esr'])
OSES = set(['Windows_NT', 'Linux', 'Darwin'])

def cPickle_deep_copy(obj):
    try:
        return cPickle.loads(cPickle.dumps(obj, -1))
    except PicklingError:
        return copy.deepcopy(obj)

def PayloadParseError(Exception): pass
def ProcessError(Exception): pass
class DataMissing(Exception): 
    def __init__(self, v):
        self.value = v

def parse(payload):
    try:
        data = json.loads(payload.split('\t')[1])
        return data
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

def date(processed_data, return_string=True):
    if return_string: return processed_data['date'].strftime('%Y-%m-%d')
    return processed_data['date']

def release_channel(processed_data):
    try: out=processed_data['environment']
    except: raise DataMissing('environment')
    try: out=out['org.mozilla.appInfo.appinfo']
    except: raise DataMissing('release_channel-org.mozilla.appInfo.appinfo')
    try: out=out['updateChannel']
    except: raise DataMissing('release_channel-updateChannel')
    if out not in CHANNELS:
        out = 'other'
    return out
    

def OS(processed_data):
    try:
        o = processed_data['environment']['org.mozilla.sysinfo.sysinfo']['name']
        if o not in OSES:
            o = 'other'
        return o
    except:
        raise DataMissing('os-version')

def OS_version(processed_data):
    try:
        return processed_data['environment']['org.mozilla.sysinfo.sysinfo']['version']
    except:
        raise DataMissing('os-version')

def total_plugin_hangs(processed_data):
    total=0
    for this_day in processed_data['data']:
        # print day
        # print
        # this_day = processed_data['data'][day]
        if 'org.mozilla.crashes.crashes' in this_day:
            if 'plugin-hang' in this_day['org.mozilla.crashes.crashes']:
                total += this_day['org.mozilla.crashes.crashes']['plugin-hang']
    return total

def total_session_time(processed_data):
    total=0
    for this_day in processed_data['data']:
        #this_day = processed_data['data'][day]
        if 'org.mozilla.appSessions.previous' in this_day:
            sessions = this_day['org.mozilla.appSessions.previous']
            try:
                if 'cleanActiveTicks'  in sessions: total += sum(sessions['cleanActiveTicks'])*5
                if 'cleanAbortedTicks' in sessions: total += sum(sessions['cleanAbortedTicks'])*5
                if 'cleanTotalTime'    in sessions: total += sum(sessions['cleanTotalTime'])
                if 'abortedTotalTime'  in sessions: total += sum(sessions['abortedTotalTime'])
            except:
                raise DataMissing('ticks')
    return total

def was_active(processed_data):
    for day in processed_data['data']:
        if 'org.mozilla.appSessions.previous' in processed_data['data']: return True
    return False
        
def geoCountry(unprocessed_data):
    c = unprocessed_data['geoCountry']
    if c not in COUNTRIES:
        return 'other'
    return c

def country_code(processed_data):
    return processed_data['environment']['country_code']

def MTBF(processed_data):
    total_time   = total_session_time(processed_data)
    plugin_hangs = total_plugin_hangs(processed_data)
    if plugin_hangs >= 2:
        return total_time / plugin_hangs
    else:
        return None

# copy everything in last that is relevant
# for each day, give all the relevant data:
#       all the keys on the topmost level

def organize_data_into_time_periods(data, resolution='weekly'):
    '''This function mutates the FHR payload into a workable periods per payload. 

    The returned object can be iterated over, and the other functions

    For instance, if I want to set up an FHR payload to answer questions on a weekly
    level, I would need to organize all the date-based measurement data in terms of weeks.

    '''
    matched = {}
    default_environment = data['data']['last']

    _country = geoCountry(data)

    if not has_data(data): raise DataMissing('data.days')

    _days = days(data)
    for day in _days:
        this_day = _days[day]
        try:
            computed_date = datetime.strptime(day, '%Y-%m-%d').date()
        except:
            raise DataMissing('computed_date')

        if resolution=='daily':
            fr = computed_date - timedelta(days=0)
            to = fr
        if resolution=='weekly':
            fr = computed_date - timedelta(days=computed_date.weekday())
            to = fr + timedelta(days=6)
        if resolution=='monthly':
            fr = computed_date - timedelta(days=computed_date.day-1)
            to = fr + timedelta(days=31)
            to = to - timedelta(days=to.day) + timedelta(days=1)

        if fr not in matched:                                 matched[fr]                       = {}
        if 'date' not in matched[fr]:                         matched[fr]['date'] = fr
        if 'environment' not in matched[fr]:                  matched[fr]['environment']        = cPickle_deep_copy(default_environment)
        if 'country_code' not in matched[fr]['environment']:  matched[fr]['environment']['country_code'] = _country
        if 'data'       not in matched[fr]:                   matched[fr]['data']               = []
        matched[fr]['data'].append(this_day)
    return matched
