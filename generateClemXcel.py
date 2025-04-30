import re
import os
import json
from toolkit import run, loadIncluded

commit = True
wpt_repository = "https://github.com/vaev-org/wpt.git"
REGEX_CSS_PROP = r"(?<=\s|\{)((-[a-z]+-)?[a-z]+(-[a-z0-9]+)*)\s*:"
COMPILED_CSS_REGEX = re.compile(REGEX_CSS_PROP)

def extractProps(fileName):
    """
    Extracts CSS properties from a given file content.

    Args:
        fileName (str): The name of the file to extract properties from.

    Returns:
        set: A set of unique CSS properties found in the file.
    """
    fd = open(fileName, "r")
    content = fd.read()
    fd.close()

    matches = re.finditer(COMPILED_CSS_REGEX, content)

    res = set()
    for _, match in enumerate(matches, start=1):
        if match.group() not in res:
            res.add(match.group()[:-1])

    return res

def extractResults(fileName):
    """
    Extracts results from the WPT logs and saves them in a structured format.
    """
    fd = open(f"./logs/passing/{included[i].replace('/', '_')}.json", "r")
    content = json.load(fd)
    fd.close()

    return set(content)


def saveResults(content):
    fd = open(f"./logs/interdependence/report.json", "w+")
    fd.write(json.dumps(content))
    fd.close()


included = loadIncluded()
run(f"git clone {wpt_repository} wpt --depth 1")
report = {}

for i in range(len(included)):
    # extract which tests are passing
    name = f"./logs/passing/{included[i].replace('/', '_')}.json"
    if os.path.exists(name):
        results = extractResults(included[i])
    else:
        print(f"File {name} does not exist.")
        continue

    dir = f"./wpt/{included[i]}"
    if os.path.exists(dir):
        files = os.listdir(dir)
        for file in files:
            if file.endswith(".html") or file.endswith(".xht"):
                props = extractProps(dir+'/'+file)
                if dir[5:]+'/'+file in results:
                    passing = True
                else:
                    passing = False
                for prop in props:
                    if prop not in report:
                        report[prop] = {}

                    for prop2 in props:
                        if prop2 not in report[prop]:
                            report[prop][prop2] = [0, 0] # using a list because it takes less place on disk

                        report[prop][prop2][1] += 1
                        if passing:
                            report[prop][prop2][0] += 1

    else:
        print(f"Directory {dir} does not exist.")
        continue


output = {"rows": [], "content": []}

for row in report:
    output["rows"].append(row)
    line = []
    for col in report:
        if col not in report[row]:
            line.append([0, 0])
        else:
            line.append(report[row][col])
    output["content"].append(line)

saveResults(output)

if commit:
    print("Commiting the results")
    run("git config --global user.name 'Zima b-lou'")
    run("git config --global user.email 'zima@carbonlab.dev'")
    run("git add -A --force logs")
    run("git commit -am '🤖 [Automated] Update WPT interdependence graph'")
    run("git push")
