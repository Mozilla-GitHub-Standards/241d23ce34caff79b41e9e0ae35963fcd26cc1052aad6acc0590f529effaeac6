import json
import sys
import csv

# sum everything
wr = csv.writer(open('plugin-hangs.csv', 'w'))


_m = {}

wr.writerow(['date', 'channel', 'country', 'os', 'os_version', 'actives', 'no_hangs', 'total_hangs', 'mtbf'])

for line in sys.stdin:
	line = json.loads(line)
	wr.writerow([
		line['date'], 
		line['release_channel'], 
		line['country'], 
		line['os'],
		line['os_version'],
		line['actives'],
		line['no_plugin_hangs'],
		line['total_plugin_hangs'],
		line['mtfb']
	])