import subprocess
import json
import datetime
import os
import requests

commit = True
report_discord = True
MATRIX_SIZE = 8
webhook_url = os.environ.get('DISCORD_WEBHOOK_URL')

def run(command):
    subprocess.run(command, shell=True, check=True)


print("Processing the results...")
#retreive last log

wpt_repository = "https://github.com/vaev-org/wpt.git"
includedTests = "https://raw.githubusercontent.com/odoo/paper-muncher/refs/heads/main/meta/wpt/includelist"

def download_file(url, save_path):
    """
    Downloads a file from a given URL and saves it to the specified path.

    Args:
        url (str): The URL of the file to download.
        save_path (str): The local path where the file should be saved.
    """
    try:
        response = requests.get(url, stream=True)  # stream=True for large files
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        with open(save_path, 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192): #8192 is a good chunk size
                if chunk:  # filter out keep-alive new chunks
                    file.write(chunk)

        print(f"File downloaded successfully to: {save_path}")

    except requests.exceptions.RequestException as e:
        print(f"Error downloading file: {e}")
    except IOError as e:
        print(f"Error saving file: {e}")

def loadIncluded():
    download_file(includedTests, "./includedTests")
    f = open("./includedTests", "r")
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
    passing = {'summary':[]}

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
    for suite in structured:
        if suite == 'summary':
            fileName = "wpt"
        else:
            fileName = suite.replace('/', '_')

        fd = open(f"./logs/passing/{fileName}.json", "w+")
        fd.write(json.dumps(passing[suite]))
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