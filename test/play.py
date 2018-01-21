import time
import os
cwd = os.getcwd() + '/'
dir_path = os.path.dirname(os.path.realpath(__file__)) + '/'

fname = dir_path + 'replay.m8x8'

for x in range(8):
    for y in range(8):
        print(x, y)


def replay(items):
    params = {}
    rows = []
    for row in items:
        chunk = row.split(':')
        if len(chunk) > 1:
            params[chunk[0]] = chunk[1]
        else:
            rows.append(row)

    print("E: " + params['epoch'] + " Size: " + str(len(rows)))


while True:
    with open(fname) as f:
        content = f.readlines()
    content = [x.strip() for x in content]
    if len(content) > 0:
        replay(content)
    time.sleep(1)
