import subprocess
import json

commit = False

wpt_repository = "https://github.com/vaev-org/wpt.git"
target_repository = "https://github.com/odoo/paper-muncher.git"

def run(command):
    subprocess.run(command, shell=True, check=True)

#clone latest target repository
# run(f"git clone {target_repository} paper-muncher")

#install the target
# run("./paper-muncher/ck tools setup")
# run("./paper-muncher/ck package install --mixins=release --prefix=$HOME/.local/opt/paper-muncher")

#clone latest WPT repository
# run(f"git clone {wpt_repository} wpt")

#generate WPT hosts
# run("./wpt/wpt make-hosts-file | sudo tee -a /etc/hosts")

#run WPT
run("cd wpt && ./wpt run paper_muncher --webdriver-binary paper_muncher_webdriver --test-type=reftest --include css/css-color")

#retreive last log
f = open("wpt/result.txt", "r")
res = json.loads(f.readline())
f.close()
#append it to ours

fd = open("logs/wpt.json", "r+")
content = json.load(fd)
print(type(content))
content.append(res)

fd.seek(0) # replace content
fd.write(json.dumps(content))
fd.truncate()
fd.close()

if commit:
    run("git config --global user.name 'Zima b-lou'")
    run("git config --global user.email 'zima@carbonlab.dev'")
    run("git add -A --force logs/")
    run("git commit -am '🤖 [Automated] Update WPT compliance Check'")
    run("git push")