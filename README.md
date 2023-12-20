# AutoBeePot

This script allows you to perform actions on Honeygain such as claiming Lucky Pot winnings/Achievements, and sending updates to a Discord server channel with your account balance, winning claims and converted balance in localised currency.

## Getting Started

Follow the instructions below to set up and use AutoBeePot:

### Installation

1. Download this repository to your local machine.
   
   Click here to download the ZIP file or...

   run the command:
   
   ```bash
   git clone https://github.com/danielytuk/AutoBeePot.git
   ```

3. Navigate to the project directory.
   ```bash
   cd AutoBeePot
   ```

4. Run the script:
   ```bash
   node AutoBeePot.js
   ```

### Configuration

1. Open the `Config/HoneygainConfig.json` file in a text editor.

2. Edit the configuration with your Honeygain account details:
   - **User:** Update the email, password, Discord webhook, mention, and currency fields.
   - **Settings:** Customize Lucky Pot, Achievements, and alert settings.
   - **Url:** These URLs should not be changed unless there are updates to the Honeygain API.

3. Save the changes.

### Usage

1. Run the script:
   ```bash
   node AutoBeePot.js
   ```

2. The script will perform the configured actions, such as claiming achievements, checking Lucky Pot winnings, and sending Discord updates.

## Important Note

- Ensure that you keep your configuration file and token secure.
- Ensure that you keep your configuration file (`HoneygainConfig.json`) updated with the correct details.

## Contributions

If you encounter any issues or have suggestions for improvements, feel free to open an issue or submit a pull request.
Please note: I won't be active fully on this repository; for faster communication, contact me on Discord: https://discord.gg/wh4buD2nRD

---

**Disclaimer:** Use this script responsibly and at your own risk. The developer is not responsible for any misuse or damage caused by this script.
