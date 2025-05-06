from toolkit import run

target_repository = "https://github.com/odoo/paper-muncher.git"
runner_repository = "https://github.com/vaev-org/samples.git"


print("Preparing the environment...")
#clone latest target repository
run(f"git clone {target_repository} paper-muncher --depth 1")
run(f"git clone {runner_repository} samples --depth 1")

#install the target
run("cd paper-muncher && ./ck tools setup") #cd ing because ck does not handle relative paths correctly
run("cd paper-muncher && ./ck package install --mixins=release --prefix=$HOME/.local/opt/paper-muncher")
