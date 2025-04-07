import json
import datetime
import os
import requests
from toolkit import run, loadIncluded

commit = True
report_discord = True
MATRIX_SIZE = 8
webhook_url = os.environ.get('DISCORD_WEBHOOK_URL')

print("Processing the results...")
#retreive last log

wpt_repository = "https://github.com/vaev-org/wpt.git"

def processWPTdata(whitelist, data):
    current_date = datetime.date.today().strftime("%d-%m-%Y")

    structured = {'summary':{'date': current_date,'passing':0, 'failing':0}}
    passing = {'summary':[]}

    for test in data['results']:
        current_suite = None
        for suite in whitelist:
            if test['test'].strip('/').startswith(suite):
                current_suite = suite
                break

        if current_suite is None:
            print(f"Test {test['test']} not in whitelist {whitelist}")
            current_suite = 'other'

        if not current_suite in structured:
            structured[current_suite] = {'date': current_date,'passing':0, 'failing':0}

        if not current_suite in passing:
            passing[current_suite] = []

        if test['status'] == 'PASS':
            passing['summary'].append(test['test'])
            passing[current_suite].append(test['test'])
            structured['summary']['passing'] += 1
            structured[current_suite]['passing'] += 1
        else:
            structured['summary']['failing'] += 1
            structured[current_suite]['failing'] += 1

    return structured, passing

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

def paoulogs(passing):
    for suite in passing:
        if suite == 'summary':
            fileName = "wpt"
        else:
            fileName = suite.replace('/', '_')

        fd = open(f"./logs/passing/{fileName}.json", "w+")
        fd.write(json.dumps(passing[suite]))
        fd.close()

def saveIncludeList(structured):
    content = []
    for suite in structured:
        content.append({"name":suite, "compliance":structured[suite]['passing']/(structured[suite]['passing'] + structured[suite]['failing'])*100})

    fd = open("./includedlist", "w+")
    fd.write(json.dumps(content))
    fd.close()


run(f"git clone {wpt_repository} wpt --depth 1")

results = []
for i in range(0, MATRIX_SIZE):
    f = open(f"./wpt-log-{i+1}/wpt_report_{i+1}.json", "r")
    results.append(json.loads(f.readline()))
    f.close()

# merging the results
flattened = {"results":[]}
for res in results:
    flattened["results"] = flattened["results"] + res['results']

included = loadIncluded()

structured, passing = processWPTdata(included, flattened)

#append it to ours
saveResults(structured)
paoulogs(passing)
saveIncludeList(structured)

if commit:
    print("Commiting the results")
    run("git config --global user.name 'Zima b-lou'")
    run("git config --global user.email 'zima@carbonlab.dev'")
    run("git add -A --force logs")
    run("git commit -am '🤖 [Automated] Update WPT compliance Check'")
    run("git push")

def reportDiscord(structured):
    diff = []

    for structured_info in structured:
        if os.path.exists(f"./logs/{structured_info.replace('/', '_')}.json"):
            fd = open(f"./logs/{structured_info.replace('/', '_')}.json", "r")
            content = json.load(fd)
            fd.close()
            if len(content) > 1:
                if content[-1]['passing'] != content[-2]['passing']:
                    diff.append({"name":structured_info ,"diff":content[-1]['passing'] - content[-2]['passing']})


    if not diff:
        print("No diff to report")
        return

    print("Reporting to Discord")
    message = {
        'content': 'Diff between the last two runs :\n',
    }

    for i in range(len(diff)):
        message['content'] += f"{diff[i]['name']}: {diff[i]['diff']}\n"

    response = requests.post(webhook_url, data=json.dumps(message), headers={'Content-Type': 'application/json'})

    if response.status_code == 204:
        print('Message envoyé avec succès !')
    else:
        print(f'Erreur lors de l\'envoi du message : {response.status_code}')

if report_discord:
    reportDiscord(structured)