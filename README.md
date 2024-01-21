# CSS Web Autotokens - CLI Tool
Intellisense for CSS variables nested within node_modules.

## Getting Started

### Installation
1. Clone this repo
2. Adjust `./src/.env.ts` to match the package you want to enable intellisense for.
3. Install dependencies `yarn install`
4. Install the VS Code extension bundler `npm i vsce -g`
5. Bundle extension `vsce package`
6. Install the extension locally `code --install-extension css-web-autotokens-0.0.1.vsix`