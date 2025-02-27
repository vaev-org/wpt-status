import subprocess
import json
import datetime
import os

commit = False

wpt_repository = "https://github.com/vaev-org/wpt.git"
target_repository = "https://github.com/odoo/paper-muncher.git"

def run(command):
    subprocess.run(command, shell=True, check=True)

print("Preparing the environment...")
#clone latest target repository
# run(f"git clone {target_repository} paper-muncher")

#install the target
# run("cd paper-muncher && ./ck tools setup") #cd ing because ck does not handle relative paths correctly
# run("cd paper-muncher && ./ck package install --mixins=release --prefix=$HOME/.local/opt/paper-muncher")

#clone latest WPT repository
# run(f"git clone {wpt_repository} wpt")

#generate WPT hosts
run("./wpt/wpt make-hosts-file | sudo tee -a /etc/hosts")


#run WPT
print("Running WPT...")
try :
    run("PATH=$PATH:$HOME/.local/opt/paper-muncher/bin && cd wpt && ./wpt run paper_muncher --webdriver-binary paper_muncher_webdriver --test-type=reftest --log-wptreport ./result.json --include-file ../wpt-whitelist")
except Exception: # broad exception because wpts are randomly raising errors for no reason
    print("WPT failed")

print("Processing the results...")
#retreive last log

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

f = open("./wpt/result.json", "r")
res = json.loads(f.readline())
f.close()


whitelist = loadWhiteList()
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