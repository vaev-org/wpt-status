import subprocess
import requests

includedTests = "https://raw.githubusercontent.com/odoo/paper-muncher/refs/heads/main/meta/wpt/includelist"

def run(command):
    subprocess.run(command, shell=True, check=True)

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