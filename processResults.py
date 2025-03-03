import subprocess
import json
import datetime
import os

commit = True
MATRIX_SIZE = 8

def run(command):
    subprocess.run(command, shell=True, check=True)


print("Processing the results...")
#retreive last log

wpt_repository = "https://github.com/vaev-org/wpt.git"

def loadWhiteList():
    f = open("./wpt-whitelist", "r")
    whitelist = f.read()
    f.close()
    print(f"WHITE: {whitelist}")
    whitelist = whitelist.strip().split("\n")
    for i in range(len(whitelist)):
        whitelist[i] = whitelist[i].strip('/')
    return whitelist

def processWPTdata(whitelist, data):
    current_date = datetime.date.today().strftime("%d-%m-%Y")

    structured = {'summary':{'date': current_date,'passing':0, 'failing':0}}
    for test in data['results']:
        current_suite = None
        for suite in whitelist:
            if test['test'].strip('/').startswith(suite):
                current_suite = suite
                print(f"Found suite {suite}")
                break

        if current_suite is None:
            print(f"Test {test['test']} not in whitelist {whitelist}")
            current_suite = 'other'

        if not current_suite in structured:
            structured[current_suite] = {'date': current_date,'passing':0, 'failing':0}

        if test['status'] == 'PASS':
            structured['summary']['passing'] += 1
            structured[current_suite]['passing'] += 1
        else:
            structured['summary']['failing'] += 1
            structured[current_suite]['failing'] += 1

    return structured

def saveResults(structured):
    for suite in structured:
        if suite == 'summary':
            fileName = "wpt"
        else:
            fileName = suite.replace('/', '_')

        if os.path.exists(f"./logs/{fileName}.json"):
            fd = open(f"./logs/{fileName}.json", "r")
            content = json.load(fd)
            fd.close()
        else:
            content = []
        content.append(structured[suite])

        fd = open(f"./logs/{fileName}.json", "w+")
        fd.write(json.dumps(content))
        fd.close()

run(f"git clone {wpt_repository} wpt --depth 1")

results = []
for i in range(0, MATRIX_SIZE):
    f = open("./wpt/result.json", "r")
    results.append(json.loads(f.readline()))
    f.close()


whitelist = loadWhiteList()

for res in results:
    structured = processWPTdata(whitelist, res)

#append it to ours
saveResults(structured)


if commit:
    print("Commiting the results")
    run("git config --global user.name 'Zima b-lou'")
    run("git config --global user.email 'zima@carbonlab.dev'")
    run("git add -A --force logs")
    run("git commit -am '🤖 [Automated] Update WPT compliance Check'")
    run("git push")