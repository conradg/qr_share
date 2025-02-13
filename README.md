# QR-Share

A simple tool to quickly share a file over a local network via a QR code.

## Features

- Serves a file over HTTP with a QR code for easy sharing
- Automatically generates a downloadable link
- Uses WebSockets to detect when the client disconnects and shuts down the server
- Opens the sharing page in the browser automatically (Mac only)

## Requirements

- Bun installed

## Installation

Make sure you have Bun installed. Check the latest instructions for that on their [website](https://bun.sh/docs/installation).

Then install dependencies:

```bash
bun install
```

To share a file, run:

```bash
bun run qr-share <file-path>
```

For example:

```bash
bun run qr-share myfile.mov
```

## Automator Workflow (Optional for Mac)

Configure the Automator workflow to enable "right-click, Share via QR":

1. Run the setup script to point your automation to this directory, and your bun installation.
   
   ```bash
   bun setup_automator.ts
   ```
2. Double click the `Share via QR` file in Finder to install it.

## How It Works

1. The script extracts your local IP address.
2. It starts an HTTP server on port 3000.
3. It generates a QR code containing the download link and opens a web page with it.
4. You can scan the QR code with your phone to download the file.
5. When you close the tab with the QR code, the server automatically shuts down.

## Example Output

```
Server running on port 3000
Sharing: myfile.pdf
URL: http://192.168.1.100:3000/myfile.pdf
```

## Notes

- The script only works for local network sharing (not over the internet). Be mindful of the networks you use it on—ideally, only use it at home where you trust all devices on the network.
- The `open` command is used to launch the browser automatically (macOS only). On Linux or Windows, you may need to open the link manually.
- Files are served only while the script is running.

## License

MIT
