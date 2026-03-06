import re
import os
import json
import urllib.request
from toolkit import run, loadIncluded

commit = True
wpt_repository = "https://github.com/vaev-org/wpt.git"
REGEX_CSS_PROP = r"(?<=\s|\{|;)((-[a-z]+-)?[a-z]+(-[a-z0-9]+)*)\s*:"
COMPILED_CSS_REGEX = re.compile(REGEX_CSS_PROP)

# MDN CSS properties data URL
MDN_CSS_PROPERTIES_URL = "https://raw.githubusercontent.com/mdn/data/main/css/properties.json"
VALID_CSS_PROPERTIES = None

def loadCssProperties():
    """
    Loads CSS properties from MDN's data repository.
    Falls back to a cached file if network is unavailable.
    """
    global VALID_CSS_PROPERTIES
    cache_file = "./logs/css-properties-cache.json"
    
    # Try to fetch from MDN
    try:
        print("Fetching CSS properties from MDN...")
        with urllib.request.urlopen(MDN_CSS_PROPERTIES_URL, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            # Extract property names, filtering out vendor-prefixed and private ones
            props = set()
            for prop in data.keys():
                # Skip vendor prefixed and custom properties
                if prop.startswith('-') or prop.startswith('--'):
                    # But extract the base property name from vendor-prefixed
                    base = re.sub(r'^-[a-z]+-', '', prop)
                    if base and not base.startswith('-'):
                        props.add(base)
                else:
                    props.add(prop)
            
            # Cache for offline use
            with open(cache_file, 'w') as f:
                json.dump(list(props), f)
            
            print(f"Loaded {len(props)} CSS properties from MDN")
            VALID_CSS_PROPERTIES = props
            return props
    except Exception as e:
        print(f"Failed to fetch from MDN: {e}")
    
    # Fallback to cache
    if os.path.exists(cache_file):
        print("Using cached CSS properties...")
        with open(cache_file, 'r') as f:
            props = set(json.load(f))
            VALID_CSS_PROPERTIES = props
            return props
    
    raise Exception("No CSS properties data available (network failed and no cache)")

# Load CSS properties at module init
VALID_CSS_PROPERTIES = loadCssProperties()

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
        prop = match.group(1).strip()  # group(1) to get without the colon
        
        # Strip vendor prefix to check against whitelist
        base_prop = prop
        if prop.startswith('-webkit-') or prop.startswith('-moz-') or prop.startswith('-ms-') or prop.startswith('-o-'):
            base_prop = re.sub(r'^-[a-z]+-', '', prop)
        
        # Only include if it's a valid CSS property
        if base_prop in VALID_CSS_PROPERTIES:
            res.add(base_prop)  # Normalize to unprefixed version

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
testIndex = []  # Global list of test file paths
testIndexMap = {}  # Map from test path to index

def getTestIndex(testPath):
    """Get or create an index for a test path."""
    if testPath not in testIndexMap:
        testIndexMap[testPath] = len(testIndex)
        testIndex.append(testPath)
    return testIndexMap[testPath]

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
                testPath = dir[5:]+'/'+file  # Remove "./wpt/" prefix
                isPassing = testPath in results
                testIdx = getTestIndex(testPath)
                
                for prop in props:
                    if prop not in report:
                        report[prop] = {}

                    for prop2 in props:
                        if prop2 not in report[prop]:
                            # [passing_count, total_count, passing_indices, failing_indices]
                            report[prop][prop2] = [0, 0, [], []]

                        report[prop][prop2][1] += 1
                        if isPassing:
                            report[prop][prop2][0] += 1
                            report[prop][prop2][2].append(testIdx)
                        else:
                            report[prop][prop2][3].append(testIdx)

    else:
        print(f"Directory {dir} does not exist.")
        continue


output = {"rows": [], "content": [], "tests": testIndex}

for row in report:
    output["rows"].append(row)
    line = []
    for col in report:
        if col not in report[row]:
            line.append([0, 0, [], []])
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
