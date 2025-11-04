from toolkit import run, loadIncluded

wpt_repository = "https://github.com/vaev-org/wpt.git"
target_repository = "https://github.com/odoo/paper-muncher.git"
included = loadIncluded()


print("Preparing the environment...")
#clone latest target repository
run(f"git clone {target_repository} paper-muncher --depth 1")

#install the target
run("cd paper-muncher && ./ck tools setup") #cd ing because ck does not handle relative paths correctly
run("cd paper-muncher && ./ck package --release --prefix=$HOME/.local/opt/paper-muncher paper-muncher")

#clone latest WPT repository
run(f"git clone {wpt_repository} wpt --depth 1")

#generate WPT hosts
run("./wpt/wpt make-hosts-file | sudo tee -a /etc/hosts")
