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

#install prince
prince_package = "https://www.princexml.com/download/prince_16-1_ubuntu24.04_amd64.deb"
run(f"wget {prince_package} -O prince.deb")
run(f"sudo apt install -y gdebi")
run(f"sudo gdebi -n prince.deb")

#install wkhtmltopdf
run("sudo apt install -y wkhtmltopdf")

#install chrome
chrome_package = "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"
run(f"wget {chrome_package} -O chrome.deb")
run(f"sudo dpkg -i ./chrome.deb")

#install weasyprint
run("sudo apt install -y weasyprint")
