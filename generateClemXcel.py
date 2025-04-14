import re
import os
import json
from toolkit import run, loadIncluded

commit = False
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


included = loadIncluded()
included = ['css/css-borders']
# run(f"git clone {wpt_repository} wpt --depth 1")
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
    print(f"Directory: {dir}, results = {results}")
    if os.path.exists(dir):
        files = os.listdir(dir)
        for file in files:
            if file.endswith(".html") or file.endswith(".xht"):
                print(f"File: {file}")
                props = extractProps(dir+'/'+file)
                if dir[5:]+'/'+file in results:
                    passing = True
                else:
                    passing = False
                print(f"Props: {props}, {passing}")
    else:
        print(f"Directory {dir} does not exist.")
        continue




if commit:
    print("Commiting the results")
    run("git config --global user.name 'Zima b-lou'")
    run("git config --global user.email 'zima@carbonlab.dev'")
    run("git add -A --force logs")
    run("git commit -am '🤖 [Automated] Update WPT interdependence graph'")
    run("git push")
