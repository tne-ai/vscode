# Visual Studio Code - Open Source ("Code - OSS")

[![Feature Requests](https://img.shields.io/github/issues/microsoft/vscode/feature-request.svg)](https://github.com/microsoft/vscode/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)
[![Bugs](https://img.shields.io/github/issues/microsoft/vscode/bug.svg)](https://github.com/microsoft/vscode/issues?utf8=✓&q=is%3Aissue+is%3Aopen+label%3Abug)
[![Gitter](https://img.shields.io/badge/chat-on%20gitter-yellow.svg)](https://gitter.im/Microsoft/vscode)

## The Repository

This repository ("`Code - OSS`") is where we (Microsoft) develop the [Visual Studio Code](https://code.visualstudio.com) product together with the community. Not only do we work on code and issues here, we also publish our [roadmap](https://github.com/microsoft/vscode/wiki/Roadmap), [monthly iteration plans](https://github.com/microsoft/vscode/wiki/Iteration-Plans), and our [endgame plans](https://github.com/microsoft/vscode/wiki/Running-the-Endgame). This source code is available to everyone under the standard [MIT license](https://github.com/microsoft/vscode/blob/main/LICENSE.txt).

## Visual Studio Code

<p align="center">
  <img alt="VS Code in action" src="https://user-images.githubusercontent.com/35271042/118224532-3842c400-b438-11eb-923d-a5f66fa6785a.png">
</p>

[Visual Studio Code](https://code.visualstudio.com) is a distribution of the `Code - OSS` repository with Microsoft-specific customizations released under a traditional [Microsoft product license](https://code.visualstudio.com/License/).

[Visual Studio Code](https://code.visualstudio.com) combines the simplicity of a code editor with what developers need for their core edit-build-debug cycle. It provides comprehensive code editing, navigation, and understanding support along with lightweight debugging, a rich extensibility model, and lightweight integration with existing tools.

Visual Studio Code is updated monthly with new features and bug fixes. You can download it for Windows, macOS, and Linux on [Visual Studio Code's website](https://code.visualstudio.com/Download). To get the latest releases every day, install the [Insiders build](https://code.visualstudio.com/insiders).

## Contributing

There are many ways in which you can participate in this project, for example:

* [Submit bugs and feature requests](https://github.com/microsoft/vscode/issues), and help us verify as they are checked in
* Review [source code changes](https://github.com/microsoft/vscode/pulls)
* Review the [documentation](https://github.com/microsoft/vscode-docs) and make pull requests for anything from typos to additional and new content

If you are interested in fixing issues and contributing directly to the code base,
please see the document [How to Contribute](https://github.com/microsoft/vscode/wiki/How-to-Contribute), which covers the following:

* [How to build and run from source](https://github.com/microsoft/vscode/wiki/How-to-Contribute)
* [The development workflow, including debugging and running tests](https://github.com/microsoft/vscode/wiki/How-to-Contribute#debugging)
* [Coding guidelines](https://github.com/microsoft/vscode/wiki/Coding-Guidelines)
* [Submitting pull requests](https://github.com/microsoft/vscode/wiki/How-to-Contribute#pull-requests)
* [Finding an issue to work on](https://github.com/microsoft/vscode/wiki/How-to-Contribute#where-to-contribute)
* [Contributing to translations](https://aka.ms/vscodeloc)

## Building and Packaging the Application

This section outlines the steps to build and package the Compass application for various platforms. The build process uses `npm` for dependency management and `gulp` for task automation.

### Prerequisites:

*   Node.js (LTS version recommended)
*   npm (usually comes with Node.js)

### Build Steps:

1.  **Navigate to the `desktop/vscode` directory**:
    All build commands should be executed from this directory.

    ```bash
    cd desktop/vscode
    ```

2.  **Install Dependencies**:
    Install all necessary Node.js dependencies for the main application and its extensions.

    ```bash
    npm install
    ```

3.  **Compile the Application**:
    Compile the application's source code. This prepares the files for packaging.

    ```bash
    node ./node_modules/gulp/bin/gulp.js compile
    ```

4.  **Build the Compass Extension VSIX**:
    Ensure your Compass extension VSIX is built and available in `extern/compass/bin/`. If not, you'll need to build it separately (e.g., using `vsce package` in your extension's directory). The `inject-extension.mjs` script will automatically pick up the latest VSIX by modification time.


6.  **Package the Application for Release**:
    After compilation and extension injection, package the application for your desired platform and architecture. The output will be a directory (e.g., `VSCode-darwin-arm64/`) in the `desktop/` directory.

    Choose your target platform and architecture:
    *   **macOS (darwin):** `x64`, `arm64`
    *   **Windows (win32):** `x64`, `arm64`
    *   **Linux:** `x64`, `armhf`, `arm64`

    Execute the corresponding Gulp task. For example, for macOS `arm64`:

    ```bash
    node ./node_modules/gulp/bin/gulp.js vscode-darwin-arm64
    ```

    Replace `vscode-darwin-arm64` with the appropriate task for your target (e.g., `vscode-darwin-x64`, `vscode-win32-x64`, `vscode-linux-x64`).

7.  **Inject the Compass Extension**:
    The main application build process does *not* automatically inject the Compass extension. You must manually run the `inject-extension.mjs` script to include your custom extension into the built application bundle. This step should be performed *after* the main application packaging (Step 6).

    First, navigate to the `desktop/compass-desktop/scripts/` directory. Then, run the script, specifying your target platform (e.g., `darwin` for macOS) and the path to the *newly created* application bundle.

    ```bash
    cd ../../compass-desktop/scripts/
    node inject-extension.mjs darwin --app-path /Users/lhahn1/ws/git/compass-ide/desktop/VSCode-darwin-arm64/Compass.app # Adjust path and platform as needed
    cd ../../vscode/ # Return to the desktop/vscode directory
    ```

    *Note: This script will find the latest `.vsix` file in `extern/compass/bin/` and inject it into the appropriate location within the built application bundle. The `--app-path` argument is crucial here to ensure the correct application bundle is modified.*

8.  **Create a Distributable Archive**:
    Finally, create a zip archive of the packaged application directory for easy distribution. Navigate to the `desktop/` directory and execute the `zip` command.

    For macOS `arm64`:

    ```bash
    cd ../ # Navigate to the desktop/ directory
    zip -r Compass-darwin-arm64.zip VSCode-darwin-arm64
    ```

    Replace `Compass-darwin-arm64.zip` and `VSCode-darwin-arm64` with the appropriate names for your target platform and architecture.
## Packaging and Distribution for macOS

When distributing the Compass application for macOS, you may encounter Gatekeeper warnings such as "“Compass” cannot be opened because the developer cannot be verified" or "“Compass” is damaged and can’t be opened." These issues arise because the application is not properly signed and notarized by Apple.

To ensure a smooth user experience and avoid these warnings, it is highly recommended to **sign and notarize** your application.

### Prerequisites for Signing and Notarization:

1.  **Apple Developer Program Membership**: An active membership is required to obtain the necessary certificates.
2.  **Xcode**: Install Xcode from the Mac App Store. It includes command-line tools for signing and notarization.
3.  **App-Specific Password**: Generate an app-specific password from your Apple ID account page for notarization.

### Steps to Sign and Notarize Your Application:

1.  **Obtain Developer ID Application Certificate**:
    *   Log in to your Apple Developer account.
    *   Go to "Certificates, Identifiers & Profiles".
    *   Create a new certificate, selecting "Developer ID Application".
    *   Follow the instructions to generate a Certificate Signing Request (CSR) using Keychain Access, upload it, and download your certificate (`.cer` file).
    *   Double-click the downloaded `.cer` file to install it into your Keychain Access.
    *   Verify installation by running `security find-identity -p codesigning -v` in your terminal. Note down your "Developer ID Application Identity" (e.g., `"Developer ID Application: Your Company Name (XXXXXXXXXX)"`).

2.  **Code Sign the Application**:
    Navigate to the directory containing your packaged `.app` bundle (e.g., `desktop/VSCode-darwin-arm64/Compass.app`).
    Execute the following command, replacing `"Developer ID Application: Your Company Name (XXXXXXXXXX)"` with your actual identity:

    ```bash
    codesign --force --deep --options=runtime --sign "Developer ID Application: Your Company Name (XXXXXXXXXX)" "VSCode-darwin-arm64/Compass.app"
    ```

    *   `--force`: Overwrites any existing signature.
    *   `--deep`: Signs all nested code within the bundle.
    *   `--options=runtime`: Enables the hardened runtime, a prerequisite for notarization.
    *   `--sign "..."`: Specifies your Developer ID Application identity.

3.  **Create a Notarization Archive**:
    Create a `.zip` archive of your signed application. This archive will be submitted to Apple for notarization.

    ```bash
    ditto -c -k --sequesterRsrc --keepParent VSCode-darwin-arm64/Compass.app Compass-darwin-arm64-signed.zip
    ```

4.  **Submit for Notarization**:
    Use the `notarytool` command to submit your archive to Apple. Replace `your-apple-id@example.com` with your Apple ID and `your-app-specific-password` with the password you generated.

    ```bash
    xcrun notarytool submit Compass-darwin-arm64-signed.zip --apple-id "your-apple-id@example.com" --password "your-app-specific-password" --team-id "XXXXXXXXXX" --wait
    ```

    *   `--team-id`: Your 10-character Apple Developer Team ID (found in your Apple Developer account).
    *   `--wait`: Waits for the notarization process to complete and displays the status.

5.  **Staple the Notarization Ticket**:
    Once notarization is successful, Apple issues a ticket. You need to "staple" this ticket to your application bundle.

    ```bash
    xcrun stapler staple VSCode-darwin-arm64/Compass.app
    ```

After these steps, your `Compass.app` bundle will be signed and notarized, and users should be able to open it without Gatekeeper warnings.

### Temporary Workaround (for testing only):

If you need to test an unnotarized app, users can manually remove the quarantine attribute:

1.  Download and unzip the application.
2.  Open Terminal and navigate to the directory containing the `.app` bundle.
3.  Execute: `xattr -cr VSCode-darwin-arm64/Compass.app`
## Feedback

* Ask a question on [Stack Overflow](https://stackoverflow.com/questions/tagged/vscode)
* [Request a new feature](CONTRIBUTING.md)
* Upvote [popular feature requests](https://github.com/microsoft/vscode/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)
* [File an issue](https://github.com/microsoft/vscode/issues)
* Connect with the extension author community on [GitHub Discussions](https://github.com/microsoft/vscode-discussions/discussions) or [Slack](https://aka.ms/vscode-dev-community)
* Follow [@code](https://twitter.com/code) and let us know what you think!

See our [wiki](https://github.com/microsoft/vscode/wiki/Feedback-Channels) for a description of each of these channels and information on some other available community-driven channels.

## Related Projects

Many of the core components and extensions to VS Code live in their own repositories on GitHub. For example, the [node debug adapter](https://github.com/microsoft/vscode-node-debug) and the [mono debug adapter](https://github.com/microsoft/vscode-mono-debug) repositories are separate from each other. For a complete list, please visit the [Related Projects](https://github.com/microsoft/vscode/wiki/Related-Projects) page on our [wiki](https://github.com/microsoft/vscode/wiki).

## Bundled Extensions

VS Code includes a set of built-in extensions located in the [extensions](extensions) folder, including grammars and snippets for many languages. Extensions that provide rich language support (code completion, Go to Definition) for a language have the suffix `language-features`. For example, the `json` extension provides coloring for `JSON` and the `json-language-features` extension provides rich language support for `JSON`.

## Development Container

This repository includes a Visual Studio Code Dev Containers / GitHub Codespaces development container.

* For [Dev Containers](https://aka.ms/vscode-remote/download/containers), use the **Dev Containers: Clone Repository in Container Volume...** command which creates a Docker volume for better disk I/O on macOS and Windows.
  * If you already have VS Code and Docker installed, you can also click [here](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/vscode) to get started. This will cause VS Code to automatically install the Dev Containers extension if needed, clone the source code into a container volume, and spin up a dev container for use.

* For Codespaces, install the [GitHub Codespaces](https://marketplace.visualstudio.com/items?itemName=GitHub.codespaces) extension in VS Code, and use the **Codespaces: Create New Codespace** command.

Docker / the Codespace should have at least **4 Cores and 6 GB of RAM (8 GB recommended)** to run full build. See the [development container README](.devcontainer/README.md) for more information.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.
